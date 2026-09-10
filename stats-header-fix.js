/* Keep the normal app navigation visible whenever the Stats page is active. */
(function () {
  const $ = id => document.getElementById(id);

  function restoreStatsHeader() {
    const app = $('app-screen');
    const stats = $('page-stats');
    const nav = document.querySelector('nav');
    if (!app || !stats || stats.classList.contains('hidden')) return;

    app.classList.remove('hidden');
    nav?.classList.remove('hidden');
    $('nav-stats')?.classList.add('active');
  }

  const originalSwitchPage = window.switchPage;
  if (typeof originalSwitchPage === 'function' && !window.__statsHeaderSwitchPatched) {
    window.switchPage = function (page) {
      const result = originalSwitchPage.apply(this, arguments);
      if (page === 'stats') restoreStatsHeader();
      return result;
    };
    window.__statsHeaderSwitchPatched = true;
  }

  if (window.MutationObserver && !window.__statsHeaderObserver) {
    const app = $('app-screen');
    if (app) {
      const observer = new MutationObserver(restoreStatsHeader);
      observer.observe(app, { subtree: true, attributes: true, attributeFilter: ['class'] });
      window.__statsHeaderObserver = true;
    }
  }

  restoreStatsHeader();
})();
