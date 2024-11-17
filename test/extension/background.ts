// Log when service worker starts
console.log('Service worker started');

// Setup message listener for communication
chrome.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
  sendResponse({ initialized: true });
  return true; // Keep the message channel open for async response
});

// Export empty object to make it a module
export {};