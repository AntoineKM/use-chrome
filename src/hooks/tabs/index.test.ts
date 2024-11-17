import { test, expect, waitForHooksInitialization } from "../../test/helpers";

test.describe("Chrome Tabs Hook", () => {
  test("should create and manage tabs", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/index.html`);
    await waitForHooksInitialization(page);

    // Test creating a tab with proper URL
    await test.step("Create tab", async () => {
      const newTabResult = await page.evaluate(async () => {
        const hooks = window.__CHROME_HOOKS__;
        if (!hooks?.tabs) {
          throw new Error("Tabs hooks not found");
        }

        const tab = await hooks.tabs.createTab({
          url: "https://example.com",
          active: true,
        });

        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second

        const activeTab = await hooks.tabs.getCurrentTab();

        return {
          success: !!tab,
          id: tab?.id,
          url: activeTab?.url || "",
          active: tab?.active,
        };
      });

      expect(newTabResult.success).toBe(true);
      expect(newTabResult.url).toMatch(/^https?:\/\/(www\.)?example\.com/);
      expect(newTabResult.active).toBe(true);
    });

    // Wait for tab to load
    await page.waitForTimeout(1000);

    // Test getting active tab
    await test.step("Get active tab", async () => {
      const activeTab = await page.evaluate(() => {
        const hooks = window.__CHROME_HOOKS__;
        return hooks.tabs.activeTab;
      });

      expect(activeTab).toBeTruthy();
      expect(activeTab?.url).toMatch(/^https?:\/\/(www\.)?example\.com/);
    });

    // Test closing a tab
    await test.step("Close tab", async () => {
      const result = await page.evaluate(async () => {
        const hooks = window.__CHROME_HOOKS__;
        const { tabs } = hooks;
        if (tabs.activeTab?.id) {
          return await tabs.closeTab(tabs.activeTab.id);
        }
        return false;
      });

      expect(result).toBe(true);
    });
  });

  test("should handle tab updates", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/index.html`);
    await waitForHooksInitialization(page);

    await test.step("Update tab", async () => {
      const updateResult = await page.evaluate(async () => {
        const hooks = window.__CHROME_HOOKS__;
        if (!hooks?.tabs) {
          throw new Error("Tabs hooks not found");
        }
    
        // Create and update tab
        const tab = await hooks.tabs.createTab({
          url: "https://example.com",
          active: true,
        });
    
        if (!tab?.id) return null;
    
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for tab to load
    
        const updated = await hooks.tabs.updateTab(tab.id, {
          url: "https://example.com/updated",
          pinned: true,
        });
    
        if (!updated) return null;
    
        // Wait for the tab to update
        await new Promise((resolve) => setTimeout(resolve, 1000));
    
        // Get the active tab again to check the updated URL
        const activeTab = await hooks.tabs.getCurrentTab();
    
        return {
          success: true,
          url: activeTab?.url || "",
          pinned: updated.pinned,
        };
      });
    
      expect(updateResult).toBeTruthy();
      expect(updateResult?.url).toMatch(/^https?:\/\/(www\.)?example\.com\/updated/);
      expect(updateResult?.pinned).toBe(true);
    });
  });
});
