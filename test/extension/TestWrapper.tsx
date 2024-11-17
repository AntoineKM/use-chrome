import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChromeStorageProvider } from '../../src/hooks/storage';
import { useChromeStorage } from '../../src/hooks/storage';
import { useChromeTabs } from '../../src/hooks/tabs';

// Component that exposes hooks to window for testing
const TestComponent: React.FC = () => {
  const [isReady, setIsReady] = React.useState(false);
  // Initialize hooks
  const storage = useChromeStorage('test-key', { area: 'local' });
  const tabs = useChromeTabs();

  // Expose hooks to window
  React.useEffect(() => {
    (window as any).chromeHooks = {
      storage,
      tabs
    };
    setIsReady(true);
  }, [storage, tabs]);

  return <div id="hooks-container" data-hooks-ready={isReady} />;
};

// Main wrapper component
const TestWrapper: React.FC = () => {
  return (
    <ChromeStorageProvider>
      <TestComponent />
    </ChromeStorageProvider>
  );
};

// Initialize React
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<TestWrapper />);
}