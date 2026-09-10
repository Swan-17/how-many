/* Load the drinking tracker and Top Venues features. */
(function () {
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
    loadScript('./drinking-map-session-persistence.js', () => {
      loadScript('./top-venues-map-polish.js', () => {
        loadScript('./top-venues.js', () => {
          loadScript('./top-venues-title-fix.js', () => {
            loadScript('./stats-header-fix.js', () => {
              loadScript('./stats-map-final-fix.js', () => {
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
          });
        });
      });
    });
  });
})();
