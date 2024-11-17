import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChromeStorageProvider } from '../../src/hooks/storage';
import { useChromeStorage } from '../../src/hooks/storage';
import { useChromeTabs } from '../../src/hooks/tabs';

// Make hooks available globally with data
const TestComponent: React.FC = () => {
  const storage = useChromeStorage('test-key', { area: 'local' });
  const tabs = useChromeTabs();

  React.useEffect(() => {
    // Make hooks and their data available globally
    const globalData = {
      storage: {
        ...storage,
        setValue: async (data: any) => {
          try {
            await storage.setValue(data);
            return true;
          } catch (error) {
            console.error('Storage error:', error);
            return false;
          }
        }
      },
      tabs: {
        ...tabs,
        createTab: async (options: chrome.tabs.CreateProperties) => {
          try {
            return await tabs.createTab(options);
          } catch (error) {
            console.error('Tabs error:', error);
            return null;
          }
        }
      }
    };

    (window as any).__CHROME_HOOKS__ = globalData;

    // Set ready state
    const container = document.getElementById('hooks-container');
    if (container) {
      container.setAttribute('data-hooks-ready', 'true');
    }
  }, [storage, tabs]);

  return (
    <div 
      id="hooks-container"
      style={{ display: 'block', minHeight: '50px' }}
    >
      Extension Test Container
    </div>
  );
};

// Initialize React
function init() {
  const container = document.getElementById('root');
  if (!container) return;

  const root = createRoot(container);
  root.render(
    <ChromeStorageProvider>
      <TestComponent />
    </ChromeStorageProvider>
  );
}

// Ensure we have access to chrome API
if (typeof chrome !== 'undefined' && chrome.storage) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
} else {
  console.error('Chrome API not available');
}