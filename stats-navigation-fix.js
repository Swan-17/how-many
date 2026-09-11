/* Keep page/navigation state deterministic without observing the whole app DOM. */
(function () {
  if (window.__howManyStatsNavigationFix) return;
  const $ = id => document.getElementById(id);
  const originalSwitchPage = window.switchPage;
  if (typeof originalSwitchPage !== 'function') return;

  function normalizePageState(page) {
    const app = $('app-screen');
    const nav = document.querySelector('nav');
    const map = $('top-venues-map-page');
    if (!app) return;

    app.classList.remove('hidden');
    map?.classList.add('hidden');
    nav?.classList.remove('hidden');

    if (page === 'stats') {
      $('page-stats')?.classList.remove('hidden');
      $('nav-stats')?.classList.add('active');
    }
  }

  window.switchPage = function (page) {
    let result;
    try {
      result = originalSwitchPage.apply(this, arguments);
    } finally {
      // The canonical switchPage still owns normal page selection; this only
      // clears the full-screen map overlay so it cannot cover another tab.
      normalizePageState(page);
    }
    return result;
  };

  window.__howManyStatsNavigationFix = true;
})();
