/* How Many Beers - Top Venues stats */
(function () {
  const statsSb = window.__HOW_MANY_SUPABASE__;
  const $ = id => document.getElementById(id);
  let requestId = 0;

  function esc(value) {
    return String(value ?? '').replace(/[&<>\'\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  }

  function ensureCard() {
    const page = $('page-stats');
    const chart = $('weeklyChart');
    if (!page || !chart) return null;
    let card = $('top-venues-card');
    if (card) return card;
    const weeklyCard = chart.closest('.card');
    if (!weeklyCard) return null;
    card = document.createElement('div');
    card.id = 'top-venues-card';
    card.className = 'card';
    card.innerHTML = '<button type="button" id="top-venues-button" class="btn-secondary" style="width:100%;padding:12px;text-align:left;display:flex;justify-content:space-between;align-items:center;"><strong>TOP VENUES</strong><span id="top-venues-icon">▼</span></button><div id="top-venues-body" class="hidden" style="margin-top:12px;"><div id="top-venues-list"></div></div>';
    weeklyCard.insertAdjacentElement('afterend', card);
    return card;
  }

  async function currentEmail() {
    const { data } = await statsSb.auth.getSession();
    return data?.session?.user?.email?.toLowerCase().trim() || '';
  }

  async function emailsForScope(scope) {
    const email = await currentEmail();
    if (!email) return [];
    if (scope === 'my_stats') return [email];

    let groupCodes = [];
    if (scope === 'all_friends') {
      const { data, error } = await statsSb.from('group_members').select('group_code').eq('user_email', email);
      if (error) throw error;
      groupCodes = Array.from(new Set((data || []).map(x => x.group_code).filter(Boolean)));
    } else if (scope) {
      groupCodes = [scope];
    }
    if (!groupCodes.length) return [email];

    const { data, error } = await statsSb.from('group_members').select('user_email').in('group_code', groupCodes);
    if (error) throw error;
    return Array.from(new Set((data || []).map(x => (x.user_email || '').toLowerCase().trim()).filter(Boolean)));
  }

  function syncVisibility() {
    const card = ensureCard();
    const select = $('analytics-group-select');
    if (card && select) card.classList.toggle('hidden', !select.value);
  }

  async function loadTopVenues() {
    const card = ensureCard();
    const select = $('analytics-group-select');
    const body = $('top-venues-body');
    const list = $('top-venues-list');
    if (!card || !select || !body || !list || !select.value || body.classList.contains('hidden')) return;
    if (!statsSb) { list.textContent = 'Stats connection unavailable.'; return; }

    const request = ++requestId;
    list.innerHTML = '<div style="color:var(--text-muted);font-size:12px">Loading venues…</div>';
    try {
      const emails = await emailsForScope(select.value);
      if (request !== requestId) return;
      if (!emails.length) { list.innerHTML = '<div style="color:var(--text-muted);font-size:12px">No people found for this stats view.</div>'; return; }

      const { data: sessions, error: se } = await statsSb.from('drinking_sessions')
        .select('id,venue_name,venue_address,started_at').in('user_email', emails).order('started_at', { ascending:false });
      if (se) throw se;
      if (!sessions?.length) { list.innerHTML = '<div style="color:var(--text-muted);font-size:12px">No venues visited yet.</div>'; return; }

      const { data: events, error: ee } = await statsSb.from('drink_location_events')
        .select('session_id,delta').in('session_id', sessions.map(x => x.id));
      if (ee) throw ee;

      const bySession = {};
      (events || []).forEach(x => { bySession[x.session_id] = (bySession[x.session_id] || 0) + Number(x.delta || 0); });
      const venues = {};
      sessions.forEach(s => {
        const key = `${s.venue_name || 'Unknown venue'}|${s.venue_address || ''}`;
        if (!venues[key]) venues[key] = { name:s.venue_name || 'Unknown venue', address:s.venue_address || '', drinks:0 };
        venues[key].drinks += bySession[s.id] || 0;
      });
      const rows = Object.values(venues).map(v => ({...v, drinks:Math.max(0,v.drinks)})).sort((a,b) => b.drinks-a.drinks || a.name.localeCompare(b.name));
      list.innerHTML = rows.map(v => `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border-color)"><div style="min-width:0;flex:1"><div style="font-size:13px;font-weight:700">${esc(v.name)}</div>${v.address ? `<div style="margin-top:3px;color:var(--text-muted);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(v.address)}</div>` : ''}</div><div style="color:var(--primary-color);font-size:13px;font-weight:800;white-space:nowrap">${v.drinks} drink${v.drinks === 1 ? '' : 's'}</div></div>`).join('');
    } catch (error) {
      if (request === requestId) list.innerHTML = `<div style="color:#fca5a5;font-size:12px">${esc(error.message || 'Could not load venues.')}</div>`;
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
    const select = $('analytics-group-select');
    if (!card || !select) return;
    syncVisibility();
    const button = $('top-venues-button');
    if (button && !button.__topVenuesBound) { button.addEventListener('click', toggleTopVenues); button.__topVenuesBound = true; }
    if (!select.__topVenuesBound) { select.addEventListener('change', () => { syncVisibility(); loadTopVenues(); }); select.__topVenuesBound = true; }
  }

  const timer = setInterval(install, 250);
  setTimeout(() => clearInterval(timer), 20000);
  install();
})();
