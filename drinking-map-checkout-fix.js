/* Recover gracefully when a drinking session was removed outside the tracker. */
(function () {
  const BUTTON_ID = 'tracker-checkout-btn';
  const INSTALLED_ATTR = 'data-checkout-fix-installed';

  function installCheckoutHandler() {
    const button = document.getElementById(BUTTON_ID);
    if (!button || button.getAttribute(INSTALLED_ATTR) === 'true') return;

    // Replace the handler installed by drinking-map.js so a missing server row can
    // be treated as an already-completed checkout. Real Supabase errors remain errors.
    const replacement = button.cloneNode(true);
    button.replaceWith(replacement);
    replacement.setAttribute(INSTALLED_ATTR, 'true');

    replacement.addEventListener('click', async () => {
      const checkedOut = await window.endDrinkingSession?.();
      if (checkedOut) return;

      // endDrinkingSession() returns false without clearing its local state when an
      // UPDATE matches zero rows. Reloading the session is the authoritative check:
      // if the row was deleted, loadActiveDrinkingSession() clears the stale UI state.
      await window.loadActiveDrinkingSession?.();
    });
  }

  const observer = new MutationObserver(installCheckoutHandler);
  observer.observe(document.body, { childList: true, subtree: true });
  installCheckoutHandler();
})();
