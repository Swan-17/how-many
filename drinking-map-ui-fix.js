/* UI hardening for the drinking tracker and stats venue panel. */
(function () {
  const $ = id => document.getElementById(id);

  function syncCheckinButton() {
    const button = $('tracker-check-in-btn');
    if (!button) return;
    const active = $('active-drinking-location');
    const checkedIn = !!active && !!active.querySelector('.checkin-status');
    button.classList.toggle('hidden', checkedIn);
  }

  function syncTopVenues() {
    const card = $('top-venues-card');
    const select = $('analytics-group-select');
    if (!card || !select) return;
    const value = select.value;
    const isPersonal = value === 'my_stats' || value === 'all_friends';
    if (!isPersonal && value) card.classList.remove('hidden');
  }

  function install() {
    syncCheckinButton();
    syncTopVenues();

    const active = $('active-drinking-location');
    if (active && !active.__uiFixObserver) {
      new MutationObserver(syncCheckinButton).observe(active, { childList: true, subtree: true });
      active.__uiFixObserver = true;
    }

    const select = $('analytics-group-select');
    if (select && !select.__uiFixListener) {
      select.addEventListener('change', () => setTimeout(syncTopVenues, 100));
      select.__uiFixListener = true;
    }

    if (typeof window.switchPage === 'function' && !window.__howManyDrinkingUiFixHook) {
      const original = window.switchPage;
      window.switchPage = function (page) {
        const result = original(page);
        setTimeout(() => {
          syncCheckinButton();
          syncTopVenues();
          if (page === 'tracker') {
            const activeLocation = $('active-drinking-location');
            if (activeLocation && !activeLocation.__uiFixObserver) {
              new MutationObserver(syncCheckinButton).observe(activeLocation, { childList: true, subtree: true });
              activeLocation.__uiFixObserver = true;
            }
          }
        }, 100);
        return result;
      };
      window.__howManyDrinkingUiFixHook = true;
    }
  }

  const observer = new MutationObserver(install);
  observer.observe(document.body, { childList: true, subtree: true });
  const timer = setInterval(install, 300);
  setTimeout(() => clearInterval(timer), 15000);
  install();
})();
