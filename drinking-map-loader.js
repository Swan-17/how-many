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

  // drinking-map.js already records drink_location_events. Loading a second
  // event-capture layer here caused every drink to be counted twice.
  loadScript('./drinking-map.js', () => {
    loadScript('./top-venues.js', () => {
      // The stats page populates analytics-group-select programmatically. That does
      // not fire a change event, so top-venues.js can otherwise remain hidden after
      // its initial install sees an empty select value.
      const syncTopVenuesCard = () => {
        const card = document.getElementById('top-venues-card');
        const select = document.getElementById('analytics-group-select');
        if (card && select && select.value) card.classList.remove('hidden');
      };
      syncTopVenuesCard();
      const timer = setInterval(() => {
        syncTopVenuesCard();
        const select = document.getElementById('analytics-group-select');
        if (select?.value) clearInterval(timer);
      }, 250);
      setTimeout(() => clearInterval(timer), 20000);
    });
  });
})();
