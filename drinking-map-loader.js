/* Test-only loader: always loads the map from this branch without relying on cached script content. */
(function () {
  const s = document.createElement('script');
  s.src = './drinking-map.js?test=' + Date.now();
  s.async = false;
  s.onload = () => console.log('Drinking map test script loaded');
  s.onerror = () => console.error('Drinking map test script failed to load');
  document.head.appendChild(s);
})();
