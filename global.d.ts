import { useChromeStorage } from "./src/hooks/storage";
import { useChromeTabs } from "./src/hooks/tabs";

declare global {
  interface Window {
    __CHROME_HOOKS__: {
      storage: ReturnType<typeof useChromeStorage>;
      tabs: ReturnType<typeof useChromeTabs>;
    };
  }
}

export {};