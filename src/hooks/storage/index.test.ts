import { test, expect, waitForHooksInitialization } from '../../test/helpers';

test.describe('Chrome Storage Hook', () => {
  test('should store and retrieve data', async ({ context, extensionId }) => {
    // Open extension popup
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/index.html`);
    await waitForHooksInitialization(page);

    // Test setting data
    await test.step('Set data', async () => {
      const result = await page.evaluate(async () => {
        const hooks = (window as any).__CHROME_HOOKS__;
        if (!hooks?.storage) {
          throw new Error('Storage hooks not found');
        }
        return await hooks.storage.setValue({ count: 42 });
      });

      expect(result).toBe(true);
    });

    // Test getting data
    await test.step('Get data', async () => {
      const data = await page.evaluate(() => {
        const hooks = (window as any).__CHROME_HOOKS__;
        return hooks.storage.data;
      });

      expect(data).toEqual({ count: 42 });
    });
  });
});