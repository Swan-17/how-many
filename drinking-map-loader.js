/* Test-only loader: force the current drinking-map.js and remove stale map/service-worker state. */
(function () {
  const oldScripts = document.querySelectorAll('script[src*="drinking-map.js"]');
  oldScripts.forEach((node) => node.remove());

  const loadMap = () => {
    const s = document.createElement('script');
    s.src = './drinking-map.js?test=' + Date.now();
    s.async = false;
    s.onload = () => {
      console.log('Drinking map test script loaded');
      const venues = document.createElement('script');
      venues.src = './top-venues.js?test=' + Date.now();
      venues.async = false;
      venues.onload = () => console.log('Top venues stats script loaded');
      venues.onerror = () => console.error('Top venues stats script failed to load');
      document.head.appendChild(venues);
    };
    s.onerror = () => console.error('Drinking map test script failed to load');
    document.head.appendChild(s);
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
      .then(() => caches && caches.keys ? caches.keys() : [])
      .then((keys) => Promise.all((keys || []).map((key) => caches.delete(key))))
      .catch(() => {})
      .finally(loadMap);
  } else {
    loadMap();
  }
})();
