/* How Many Beers - Top Venues stats */
(function () {
  const SB_URL = 'https://tmwmsmkivxyenulifmdk.supabase.co';
  const SB_KEY = document.querySelector('meta[name="supabase-key"]')?.content || window.__HOW_MANY_SUPABASE_KEY__;
  const statsSb = supabase.createClient(SB_URL, SB_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const $ = id => document.getElementById(id);
  let requestId = 0;
  let installed = false;

  function esc(value) {
    return String(value ?? '').replace(/[&<>\'\"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[c]));
  }

  function ensureCard() {
    const statsPage = $('page-stats');
    const weeklyChart = $('weeklyChart');
    if (!statsPage || !weeklyChart) return null;

    let card = $('top-venues-card');
    if (card) return card;

    const weeklyCard = weeklyChart.closest('.card');
    if (!weeklyCard) return null;

    card = document.createElement('div');
    card.id = 'top-venues-card';
    card.className = 'card';
    card.innerHTML = `
      <button type="button" id="top-venues-button" class="btn-secondary" style="width:100%;padding:12px;text-align:left;display:flex;justify-content:space-between;align-items:center;">
        <strong>TOP VENUES</strong><span id="top-venues-icon">▼</span>
      </button>
      <div id="top-venues-body" class="hidden" style="margin-top:12px;">
        <div id="top-venues-list"></div>
      </div>`;

    weeklyCard.insertAdjacentElement('afterend', card);
    return card;
  }

  async function getCurrentEmail() {
    const { data } = await statsSb.auth.getSession();
    return data?.session?.user?.email?.toLowerCase().trim() || '';
  }

  async function getEmailsForScope(scope) {
    if (scope === 'my_stats') {
      const email = await getCurrentEmail();
      return email ? [email] : [];
    }

    if (scope === 'all_friends') {
      const email = await getCurrentEmail();
      if (!email) return [];

      const { data: memberships, error } = await statsSb
        .from('group_members').select('group_code').eq('user_email', email);
      if (error) throw error;

      const groups = Array.from(new Set((memberships || []).map(row => row.group_code).filter(Boolean)));
      if (!groups.length) return [email];

      const { data: members, error: memberError } = await statsSb
        .from('group_members').select('user_email').in('group_code', groups);
      if (memberError) throw memberError;

      return Array.from(new Set((members || [])
        .map(row => (row.user_email || '').toLowerCase().trim()).filter(Boolean)));
    }

    if (!scope) return [];

    const { data: members, error } = await statsSb
      .from('group_members').select('user_email').eq('group_code', scope);
    if (error) throw error;

    return Array.from(new Set((members || [])
      .map(row => (row.user_email || '').toLowerCase().trim()).filter(Boolean)));
  }

  function syncVisibility() {
    const card = ensureCard();
    const select = $('analytics-group-select');
    if (!card || !select) return;
    card.classList.toggle('hidden', !select.value);
  }

  async function loadTopVenues() {
    const card = ensureCard();
    const select = $('analytics-group-select');
    if (!card || !select) return;

    const scope = select.value;
    card.classList.toggle('hidden', !scope);
    if (!scope) return;

    const body = $('top-venues-body');
    const list = $('top-venues-list');
    if (!body || !list || body.classList.contains('hidden')) return;

    const request = ++requestId;
    list.innerHTML = '<div style="color:var(--text-muted);font-size:12px">Loading venues…</div>';

    try {
      const emails = await getEmailsForScope(scope);
      if (request !== requestId) return;
      if (!emails.length) {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:12px">No people found for this stats view.</div>';
        return;
      }

      const { data: sessions, error: sessionError } = await statsSb
        .from('drinking_sessions')
        .select('id,user_email,venue_name,venue_address,started_at')
        .in('user_email', emails)
        .order('started_at', { ascending: false });
      if (request !== requestId) return;
      if (sessionError) throw sessionError;
      if (!sessions?.length) {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:12px">No venues visited yet.</div>';
        return;
      }

      const { data: events, error: eventError } = await statsSb
        .from('drink_location_events').select('session_id,delta').in('session_id', sessions.map(session => session.id));
      if (request !== requestId) return;
      if (eventError) throw eventError;

      const drinksBySession = {};
      (events || []).forEach(event => {
        drinksBySession[event.session_id] = (drinksBySession[event.session_id] || 0) + Number(event.delta || 0);
      });

      const venues = {};
      sessions.forEach(session => {
        const key = `${session.venue_name || 'Unknown venue'}|${session.venue_address || ''}`;
        if (!venues[key]) venues[key] = { name: session.venue_name || 'Unknown venue', address: session.venue_address || '', drinks: 0, sessions: 0 };
        venues[key].drinks += drinksBySession[session.id] || 0;
        venues[key].sessions += 1;
      });

      const rows = Object.values(venues)
        .map(venue => ({ ...venue, drinks: Math.max(0, venue.drinks) }))
        .sort((a, b) => b.drinks - a.drinks || b.sessions - a.sessions || a.name.localeCompare(b.name));

      list.innerHTML = rows.map(venue => `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border-color)">
          <div style="min-width:0;flex:1">
            <div style="font-size:13px;font-weight:700">${esc(venue.name)}</div>
            ${venue.address ? `<div style="margin-top:3px;color:var(--text-muted);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(venue.address)}</div>` : ''}
          </div>
          <div style="color:var(--primary-color);font-size:13px;font-weight:800;white-space:nowrap">${venue.drinks} drink${venue.drinks === 1 ? '' : 's'}</div>
        </div>`).join('');
    } catch (error) {
      if (request !== requestId) return;
      list.innerHTML = `<div style="color:#fca5a5;font-size:12px">${esc(error.message || 'Could not load venues.')}</div>`;
    }
  }

  function toggleTopVenues() {
    const body = $('top-venues-body');
    const icon = $('top-venues-icon');
    if (!body) return;
    const opening = body.classList.contains('hidden');
    body.classList.toggle('hidden', !opening);
    if (icon) icon.textContent = opening ? '▲' : '▼';
    if (opening) loadTopVenues();
  }

  window.toggleTopVenues = toggleTopVenues;

  function install() {
    const card = ensureCard();
    if (!card) return;
    syncVisibility();

    const button = $('top-venues-button');
    if (button && !button.__topVenuesBound) {
      button.addEventListener('click', toggleTopVenues);
      button.__topVenuesBound = true;
    }

    const select = $('analytics-group-select');
    if (select && !select.__topVenuesBound) {
      select.addEventListener('change', () => {
        syncVisibility();
        loadTopVenues();
      });
      select.__topVenuesBound = true;
    }

    if (!installed) {
      installed = true;
      setTimeout(syncVisibility, 100);
    }
  }

  const timer = setInterval(() => {
    install();
    if (installed && $('page-stats') && $('analytics-group-select')) clearInterval(timer);
  }, 250);
  setTimeout(() => clearInterval(timer), 15000);
  install();
})();
