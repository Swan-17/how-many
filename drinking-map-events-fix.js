/* How Many Beers - reliable venue drink event capture */
(function () {
  const sb = window.__HOW_MANY_SUPABASE__;
  if (!sb || window.__howManyVenueEventFix) return;
  window.__howManyVenueEventFix = true;

  const beforeCounts = new Map();

  function drinkAction(button) {
    const inline = button?.getAttribute?.('onclick') || '';
    const match = inline.match(/adjustDrink\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*(-?\d+)\s*\)/);
    if (!match) return null;
    return { type: match[1], delta: Number(match[2]) };
  }

  function countElement(button, type) {
    const row = button?.closest?.('.drink-row');
    return row?.querySelector?.(`#cnt-${CSS.escape(type)}`) || document.getElementById(`cnt-${type}`);
  }

  document.addEventListener('pointerdown', event => {
    const button = event.target?.closest?.('button');
    const action = drinkAction(button);
    if (!action) return;
    const count = countElement(button, action.type);
    beforeCounts.set(button, Number(count?.innerText || 0));
  }, true);

  document.addEventListener('click', event => {
    const button = event.target?.closest?.('button');
    const action = drinkAction(button);
    if (!action) return;

    setTimeout(async () => {
      const count = countElement(button, action.type);
      const after = Number(count?.innerText || 0);
      const before = beforeCounts.get(button);
      beforeCounts.delete(button);
      if (!Number.isFinite(before) || after !== before + action.delta) return;

      try {
        const session = await window.loadActiveDrinkingSession?.();
        const user = (await sb.auth.getSession()).data?.session?.user;
        if (!session || !user) return;
        const logDate = document.getElementById('today-date-label')?.innerText || new Date().toISOString().slice(0, 10);
        const { error } = await sb.from('drink_location_events').insert([{
          session_id: session.id,
          user_email: user.email,
          group_code: null,
          log_date: logDate,
          drink_type: action.type,
          delta: action.delta
        }]);
        if (error) console.error('Venue drink event failed:', error);
      } catch (error) {
        console.error('Venue drink event capture failed:', error);
      }
    }, 0);
  });
})();
