import { useChromeStorage } from '../../src/hooks/storage';
import { useChromeTabs } from '../../src/hooks/tabs';

// Make hooks available globally for testing
declare global {
  interface Window {
    useChromeStorage: typeof useChromeStorage;
    useChromeTabs: typeof useChromeTabs;
  }
}

window.useChromeStorage = useChromeStorage;
window.useChromeTabs = useChromeTabs;