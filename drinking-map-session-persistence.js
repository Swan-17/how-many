/* How Many Beers - persist pub check-in across refreshes and the daily 4am reset */
(function () {
  const sb = window.__HOW_MANY_SUPABASE__;
  const RESET_HOUR = 4;
  let lastEffectiveDate = '';
  let resetTimer = null;
  let started = false;

  function effectiveDateKey() {
    const d = new Date();
    if (d.getHours() < RESET_HOUR) d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function localDateKey(value) {
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function currentUser() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session?.user || null;
  }

  async function restoreSession() {
    if (!sb || typeof window.loadActiveDrinkingSession !== 'function') return;
    const user = await currentUser();
    if (!user) return;

    const { data: sessions, error } = await sb.from('drinking_sessions')
      .select('id,started_at,ended_at,user_email')
      .eq('user_email', user.email)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('Could not restore drinking session:', error.message);
      return;
    }

    const staleIds = (sessions || [])
      .filter(session => localDateKey(session.started_at) !== effectiveDateKey())
      .map(session => session.id)
      .filter(Boolean);

    if (staleIds.length) {
      const { error: resetError } = await sb.from('drinking_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('user_email', user.email)
        .in('id', staleIds)
        .is('ended_at', null);
      if (resetError) console.warn('Could not run morning check-in reset:', resetError.message);
    }

    await window.loadActiveDrinkingSession();
    lastEffectiveDate = effectiveDateKey();
  }

  function start() {
    if (started || !sb) return;
    started = true;
    restoreSession();

    lastEffectiveDate = effectiveDateKey();
    resetTimer = setInterval(() => {
      const currentDate = effectiveDateKey();
      if (currentDate === lastEffectiveDate) return;
      lastEffectiveDate = currentDate;
      restoreSession();
    }, 60000);
  }

  if (sb) {
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        setTimeout(restoreSession, 0);
      }
      if (event === 'SIGNED_OUT') {
        lastEffectiveDate = effectiveDateKey();
        if (resetTimer) clearInterval(resetTimer);
      }
    });
  }

  const timer = setInterval(() => {
    if (typeof window.loadActiveDrinkingSession === 'function') {
      clearInterval(timer);
      start();
    }
  }, 200);
  setTimeout(() => clearInterval(timer), 15000);
})();
