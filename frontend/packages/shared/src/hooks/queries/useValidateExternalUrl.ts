export const monitorExternalUrlFromPreviewForValidation = (urlToMonitor: string): Promise<any> => {
  let foundRequest = null;

  // Save original implementations
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  // Override fetch
  window.fetch = async function (url, ...args) {
    const response = await originalFetch(url, ...args);

    if (url.toString().includes(urlToMonitor)) {
      foundRequest = {
        type: 'fetch',
        url,
        status: response.status,
      };
    }

    return response;
  };

  // Override XMLHttpRequest
  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    this._url = url;
    originalXHROpen.call(this, method, url, ...args);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', () => {
      if (this._url.includes(urlToMonitor)) {
        foundRequest = {
          type: 'XMLHttpRequest',
          url: this._url,
          status: this.status,
        };
      }
    });
    originalXHRSend.call(this, ...args);
  };

  // Return a promise that resolves after 10 seconds
  return new Promise((resolve) => {
    setTimeout(() => {
      // Restore original implementations
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;

      // Log and resolve with the found request, if any
      if (foundRequest) {
        console.log(`Request found:`, foundRequest);
      } else {
        console.log(`No requests made to ${urlToMonitor} in the last 10 seconds.`);
      }
      resolve(foundRequest);
    }, 10000); // 10,000 ms = 10 seconds
  });
};
