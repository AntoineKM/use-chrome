import { test as base, chromium, type BrowserContext, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs-extra';

interface ExtensionFixtures {
  extensionId: string;
  context: BrowserContext;
}

async function getExtensionId(context: BrowserContext): Promise<string> {
  const page = await context.newPage();
  
  try {
    // Navigate to the extensions page
    await page.goto('chrome://extensions');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the extensions section and its shadow root
    await page.waitForSelector('extensions-manager');

    // Function to recursively query through shadow roots
    const extensionId = await page.evaluate(() => {
      function queryDeepSelector(root: Document | Element | ShadowRoot, selector: string): Element[] {
        const elements = Array.from(root.querySelectorAll(selector));
        
        // Helper function to get shadow roots
        const getShadowRoots = (element: Element): ShadowRoot[] => {
          return element.shadowRoot ? [element.shadowRoot] : [];
        };

        // Get all elements with shadow roots
        const elementShadows = Array.from(root.querySelectorAll('*'))
          .flatMap(getShadowRoots)
          .flatMap(shadow => queryDeepSelector(shadow, selector));

        // If root itself is an Element with shadowRoot, include it
        const rootShadow = root instanceof Element && root.shadowRoot
          ? queryDeepSelector(root.shadowRoot, selector)
          : [];

        return [...elements, ...elementShadows, ...rootShadow];
      }

      // Get all extensions-item elements through shadow roots
      const manager = document.querySelector('extensions-manager');
      if (!manager || !manager.shadowRoot) {
        console.log('No extensions-manager found or no shadow root');
        return null;
      }

      const items = queryDeepSelector(manager.shadowRoot, 'extensions-item');
      console.log('Found extensions:', items.length);

      if (items.length === 0) {
        console.log('No extension items found');
        return null;
      }

      // Most recently loaded extension should be last
      const lastItem = items[items.length - 1];
      const id = lastItem.getAttribute('id');

      // Debug output
      items.forEach((item, index) => {
        console.log(`Extension ${index + 1}:`, {
          id: item.getAttribute('id'),
          name: item.shadowRoot?.querySelector('.name')?.textContent,
          html: item.outerHTML
        });
      });

      return id;
    });

    if (!extensionId) {
      throw new Error('Could not find extension ID');
    }

    // Verify we can access the extension
    const testPage = await context.newPage();
    await testPage.goto(`chrome-extension://${extensionId}/index.html`);
    await testPage.close();

    console.log('Found and verified extension ID:', extensionId);
    return extensionId;
  } catch (error) {
    console.error('Error getting extension ID:', error);
    // Dump page content for debugging
    try {
      const content = await page.content();
      console.log('Page content:', content);
      
      // Additional debugging
      const debug = await page.evaluate(() => ({
        managerExists: !!document.querySelector('extensions-manager'),
        shadowRoot: !!document.querySelector('extensions-manager')?.shadowRoot,
        fullHtml: document.documentElement.outerHTML
      }));
      console.log('Debug info:', debug);
    } catch (e) {
      console.error('Could not get page content:', e);
    }
    throw error;
  } finally {
    await page.close();
  }
}

async function waitForHooksInitialization(page: Page) {
  console.log('Waiting for initialization...');
  
  // Wait for root element with longer timeout
  await page.waitForSelector('#root', { 
    state: 'attached',
    timeout: 30000
  });

  console.log('Root element found, waiting for hooks container...');

  // Wait for hooks container
  await page.waitForSelector('#hooks-container', { 
    state: 'attached',
    timeout: 30000
  });

  // Wait for hooks to be ready
  await page.waitForFunction(() => {
    const container = document.querySelector('#hooks-container');
    const isReady = container?.getAttribute('data-hooks-ready') === 'true';
    const hasHooks = !!(window as any).__CHROME_HOOKS__;
    console.log('Hook status:', { isReady, hasHooks });
    return isReady && hasHooks;
  }, { timeout: 30000 });

  // Verify hooks are actually available
  const hooksStatus = await page.evaluate(() => {
    const hooks = (window as any).__CHROME_HOOKS__;
    return {
      hasStorage: !!hooks?.storage,
      hasTabs: !!hooks?.tabs,
      isReady: !!document.querySelector('#hooks-container[data-hooks-ready="true"]')
    };
  });

  console.log('Hooks status:', hooksStatus);
  console.log('Hooks initialized successfully');
}

const verifyExtensionFiles = async (extensionPath: string) => {
  try {
    const files = await fs.readdir(extensionPath);
    console.log('Extension directory contents:', files);

    const requiredFiles = ['manifest.json', 'index.html', 'content.js', 'background.js'];
    const missingFiles = requiredFiles.filter(file => !files.includes(file));

    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }

    const manifestPath = path.join(extensionPath, 'manifest.json');
    const manifest = await fs.readJson(manifestPath);
    console.log('Manifest content:', manifest);

    return true;
  } catch (error) {
    console.error('Error verifying extension files:', error);
    throw error;
  }
};

export const test = base.extend<ExtensionFixtures>({
  context: async ({ }, use) => {
    const pathToExtension = path.join(process.cwd(), 'dist');
    console.log('Loading extension from:', pathToExtension);
    
    await verifyExtensionFiles(pathToExtension);

    const userDataDir = path.join(__dirname, '../../test-user-data');
    await fs.remove(userDataDir).catch(() => {});

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-sandbox',
      ],
      viewport: { width: 1280, height: 720 }
    });

    // Wait for extension to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    await use(context);
    
    await context.close();
    await fs.remove(userDataDir).catch(() => {});
  },

  extensionId: async ({ context }, use) => {
    // Get the extension ID with retries
    let extensionId: string | undefined;
    const MAX_RETRIES = 3;
    let lastError: Error | undefined;

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        console.log(`Attempt ${i + 1} to get extension ID...`);
        extensionId = await getExtensionId(context);
        break;
      } catch (error) {
        console.log(`Attempt ${i + 1} failed:`, error);
        lastError = error as Error;
        if (i < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!extensionId && lastError) {
      throw lastError;
    }

    await use(extensionId!);
  },
});

export { expect, waitForHooksInitialization };