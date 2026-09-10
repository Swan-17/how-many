/* Optional Google Maps loader for Top Venues. The browser key must be supplied by runtime configuration. */
(function () {
  function getKey() {
    return window.__HOW_MANY_GOOGLE_MAPS_KEY__ || document.querySelector('meta[name="google-maps-api-key"]')?.content || '';
  }

  window.loadHowManyGoogleMaps = function () {
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    const key = getKey();
    if (!key) return Promise.reject(new Error('Google Maps browser key is not configured.'));
    if (window.__howManyGoogleMapsPromise) return window.__howManyGoogleMapsPromise;

    window.__howManyGoogleMapsPromise = new Promise((resolve, reject) => {
      const callback = '__howManyGoogleMapsReady';
      window[callback] = () => {
        delete window[callback];
        resolve(window.google.maps);
      };
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&v=weekly&callback=' + callback;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete window[callback];
        reject(new Error('Could not load Google Maps.'));
      };
      document.head.appendChild(script);
    });

    return window.__howManyGoogleMapsPromise;
  };
})();
