/* How Many Beers - Top Venues stats + map */
(function () {
  const sb = window.__HOW_MANY_SUPABASE__;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const beerEquivalent = (type, delta) => ({pints:1,bottles:.6,wines:.7,cocktails:.8,shots:.4}[type] || 0) * (Number(delta) || 0);
  let venues = [], loading = false;

  function ensureCard() {
    const page = $('page-stats');
    if (!page) return null;
    let card = $('top-venues-card');
    if (card) return card;
    card = document.createElement('div');
    card.id = 'top-venues-card';
    card.className = 'card';
    card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><strong style="color:var(--primary-color)">TOP VENUES</strong><button type="button" id="top-venues-refresh" class="btn-secondary">Refresh</button></div><div id="top-venues-list" style="margin-top:10px"></div><button type="button" id="show-venues-map-btn" class="btn-submit hidden">📍 Show on Map</button>';
    page.appendChild(card);
    $('top-venues-refresh').addEventListener('click', loadTopVenues);
    return card;
  }

  async function currentEmail() {
    if (!sb) return '';
    const { data } = await sb.auth.getSession();
    return data?.session?.user?.email?.toLowerCase().trim() || '';
  }

  async function emailsForScope(scope) {
    const email = await currentEmail();
    if (!email) return [];
    if (scope === 'my_stats') return [email];
    if (scope === 'all_friends') {
      const { data: memberships, error: me } = await sb.from('group_members').select('group_code').eq('user_email', email);
      if (me) throw me;
      const codes = [...new Set((memberships || []).map(x => x.group_code).filter(Boolean))];
      if (!codes.length) return [email];
      const { data, error } = await sb.from('group_members').select('user_email').in('group_code', codes);
      if (error) throw error;
      return [...new Set((data || []).map(x => String(x.user_email || '').toLowerCase().trim()).filter(Boolean))];
    }
    if (!scope) return [email];
    const { data, error } = await sb.from('group_members').select('user_email').eq('group_code', scope);
    if (error) throw error;
    return [...new Set((data || []).map(x => String(x.user_email || '').toLowerCase().trim()).filter(Boolean))];
  }

  async function loadTopVenues() {
    const card = ensureCard(), select = $('analytics-group-select'), list = $('top-venues-list');
    if (!card || !select || !list || loading) return;
    loading = true;
    list.innerHTML = '<div style="color:var(--text-muted);font-size:12px">Loading venues…</div>';
    try {
      if (!sb) throw new Error('Stats connection unavailable.');
      const emails = await emailsForScope(select.value);
      if (!emails.length) { list.textContent = 'No people found for this stats view.'; return; }
      const { data: sessions, error: se } = await sb.from('drinking_sessions').select('id,venue_name,venue_address,latitude,longitude').in('user_email', emails);
      if (se) throw se;
      const ids = (sessions || []).map(x => x.id).filter(Boolean);
      if (!ids.length) { list.textContent = 'No venues visited yet.'; return; }
      const { data: events, error: ee } = await sb.from('drink_location_events').select('session_id,drink_type,delta').in('session_id', ids);
      if (ee) throw ee;
      const totals = {};
      (events || []).forEach(e => totals[e.session_id] = (totals[e.session_id] || 0) + beerEquivalent(e.drink_type, e.delta));
      const grouped = {};
      (sessions || []).forEach(s => {
        const name = s.venue_name || 'Unknown venue';
        const key = name + '|' + (s.venue_address || '');
        if (!grouped[key]) grouped[key] = {name, address:s.venue_address || '', drinks:0, latitude:Number(s.latitude), longitude:Number(s.longitude)};
        grouped[key].drinks += totals[s.id] || 0;
      });
      venues = Object.values(grouped).filter(v => v.drinks > 0).sort((a,b) => b.drinks - a.drinks || a.name.localeCompare(b.name));
      if (!venues.length) { list.textContent = 'No beers have been recorded at a venue yet.'; return; }
      list.innerHTML = venues.map((v,i) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color)"><div style="min-width:0"><div style="font-weight:800;font-size:13px">${i+1}. ${esc(v.name)}</div>${v.address ? `<div style="color:var(--text-muted);font-size:10px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(v.address)}</div>` : ''}</div><strong style="color:var(--primary-color);white-space:nowrap">${v.drinks.toFixed(1)} beers</strong></div>`).join('');
      $('show-venues-map-btn')?.classList.toggle('hidden', !venues.some(v => Number.isFinite(v.latitude) && Number.isFinite(v.longitude)));
    } catch (e) {
      list.innerHTML = `<div style="color:#fca5a5;font-size:12px">${esc(e.message || 'Could not load venues.')}</div>`;
    } finally { loading = false; }
  }

  function install() {
    const card = ensureCard(), select = $('analytics-group-select');
    if (!card || !select) return;
    card.classList.remove('hidden');
    if (!select.__topVenuesBound) {
      select.addEventListener('change', loadTopVenues);
      select.__topVenuesBound = true;
    }
    if (!card.__initialLoad && select.value) { card.__initialLoad = true; loadTopVenues(); }
  }

  window.loadTopVenues = loadTopVenues;
  const timer = setInterval(install, 300);
  setTimeout(() => clearInterval(timer), 30000);
  install();
})();
