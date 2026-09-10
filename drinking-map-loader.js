/* Load the drinking tracker and Top Venues features. */
(function () {
  function loadScript(src, onload) {
    const script = document.createElement('script');
    script.src = src + '?v=' + Date.now();
    script.async = false;
    if (onload) script.onload = onload;
    script.onerror = () => console.error('Feature script failed to load:', src);
    document.head.appendChild(script);
  }

  loadScript('./drinking-map.js', () => {
    loadScript('./top-venues.js');
  });
})();
