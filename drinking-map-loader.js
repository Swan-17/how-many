/* Load the drinking tracker and Top Venues features. */
(function () {
  // index.html creates the authenticated Supabase client as the global lexical `sb`.
  // Expose that same client to the dynamically loaded feature scripts so they share auth state.
  try {
    if (typeof sb !== 'undefined') window.__HOW_MANY_SUPABASE__ = sb;
  } catch (_) {}

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
