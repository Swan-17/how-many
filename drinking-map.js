/* How Many Beers - Drinking map test feature: simple pub check-in */
(function () {
  const MAP_SUPABASE_URL = 'https://tmwmsmkivxyenulifmdk.supabase.co';
  const MAP_SUPABASE_KEY = 'sb_publishable_Up-QZhkzCGzgO59fyF-zag_K7PSpYmU';
  const mapSb = supabase.createClient(MAP_SUPABASE_URL, MAP_SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const MAP_FUNCTION_URL = `${MAP_SUPABASE_URL}/functions/v1/find-nearby-venues`;
  let activeSession = null, selectedGroupCode = null, venueCandidates = [], searchTimer = null;
  const el = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));

  async function currentUser() {
    const session = (await mapSb.auth.getSession()).data?.session;
    return session?.user || null;
  }

  function addStyles() {
    if (el('drinking-map-styles')) return;
    const s = document.createElement('style');
    s.id = 'drinking-map-styles';
    s.textContent = `
      #drinking-map-page{padding-bottom:24px}
      #drinking-map-page .pub-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:18px;margin-bottom:16px}
      #drinking-map-page .pub-title{margin:0 0 6px;font-size:20px;text-align:center}
      #drinking-map-page .pub-subtitle{margin:0 0 18px;text-align:center;font-size:12px;color:var(--text-muted)}
      #drinking-map-page .pub-search-wrap{position:relative}
      #drinking-map-page #drinking-venue-search{margin-top:0;padding:14px;font-size:16px}
      #drinking-map-page .venue-candidate{display:block;width:100%;text-align:left;background:var(--bg-main);color:var(--text-main);border:1px solid var(--border-color);border-radius:9px;padding:12px;margin-top:8px;cursor:pointer}
      #drinking-map-page .venue-candidate:active{border-color:var(--primary-color)}
      #drinking-map-page .venue-candidate small{color:var(--text-muted)}
      #drinking-map-page .checkin-status{margin-top:12px;padding:12px;border-radius:9px;background:var(--bg-main);border:1px solid var(--primary-color);font-size:13px}
      #drinking-map-page .checkin-button{width:100%;padding:13px;font-size:14px;margin-top:16px}
      #drinking-map-page .pub-group{margin-top:14px}
    `;
    document.head.appendChild(s);
  }

  function addPage() {
    if (el('drinking-map-page')) return;
    const page = document.createElement('div');
    page.id = 'drinking-map-page';
    page.className = 'hidden';
    page.innerHTML = `
      <div class="pub-card">
        <h2 class="pub-title">🍻 Check in</h2>
        <p class="pub-subtitle">Where are you drinking?</p>
        <div class="pub-search-wrap">
          <input id="drinking-venue-search" type="search" placeholder="Start typing the pub name…" autocomplete="off" aria-label="Pub name">
        </div>
        <div id="venue-candidates"></div>
        <div id="active-drinking-location"></div>
        <div class="pub-group">
          <label>GROUP</label>
          <select id="drinking-map-group-select"><option value="">Personal</option></select>
        </div>
      </div>
    `;
    el('app-screen')?.appendChild(page);
    const nav = document.querySelector('#app-screen nav');
    if (nav && !el('nav-pub')) {
      const b = document.createElement('button');
      b.id = 'nav-pub'; b.textContent = 'Pub'; b.onclick = () => switchPage('pub');
      const tracker = nav.querySelector('[onclick*="tracker"]);
      if (tracker) tracker.insertAdjacentElement('afterend', b); else nav.appendChild(b);
    }
    el('drinking-venue-search')?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const value = el('drinking-venue-search').value.trim();
      if (!value) { el('venue-candidates').innerHTML = ''; return; }
      searchTimer = setTimeout(searchDrinkingVenues, 350);
    });
    el('drinking-venue-search')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { clearTimeout(searchTimer); searchDrinkingVenues(); }
    });
    el('drinking-map-group-select')?.addEventListener('change', async e => {
      selectedGroupCode = e.target.value || null;
      await loadActiveSession();
    });
  }

  async function loadActiveSession() {
    const user = await currentUser();
    if (!user) return;
    let q = mapSb.from('drinking_sessions').select('*').eq('user_email', user.email).is('ended_at', null).order('started_at', { ascending: false }).limit(1);
    q = selectedGroupCode ? q.eq('group_code', selectedGroupCode) : q.is('group_code', null);
    const { data } = await q.maybeSingle();
    activeSession = data || null;
    el('active-drinking-location').innerHTML = activeSession
      ? `<div class="checkin-status"><strong>Checked in at ${esc(activeSession.venue_name)}</strong><br><small>${esc(activeSession.venue_address || '')}</small><button class="btn-secondary" style="width:100%;margin-top:10px" onclick="endDrinkingSession()">Check out / change pub</button></div>` : '';
  }

  async function searchDrinkingVenues() {
    const input = el('drinking-venue-search'), out = el('venue-candidates');
    const query = (input?.value || '').trim();
    if (!query) { out.innerHTML = ''; return; }
    out.innerHTML = '<div style="margin-top:10px;color:var(--text-muted);font-size:12px">Finding pubs…</div>';
    try {
      const r = await fetch(MAP_FUNCTION_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': MAP_SUPABASE_KEY }, body: JSON.stringify({ query }) });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || body.message || `Venue search failed (${r.status})`);
      venueCandidates = (body.places || []).map(p => ({ ...p, latitude: p.latitude ?? p.lat ?? p.location?.latitude, longitude: p.longitude ?? p.lng ?? p.lon ?? p.location?.longitude }));
      out.innerHTML = venueCandidates.length ? venueCandidates.slice(0, 6).map((p, i) => `<button class="venue-candidate" onclick="confirmDrinkingVenue(${i})"><strong>${esc(p.name)}</strong><br><small>${esc(p.address || '')}</small></button>`).join('') : '<div style="margin-top:10px;color:var(--text-muted);font-size:12px">No pub found. Try adding the town or area.</div>';
    } catch (e) {
      out.innerHTML = `<div style="margin-top:10px;color:#fca5a5;font-size:12px">${esc(e.message || 'Could not find that pub.')}</div>`;
    }
  }

  async function confirmDrinkingVenue(i) {
    const place = venueCandidates[i], user = await currentUser();
    if (!place || !user) return;
    if (activeSession) await endDrinkingSession(true);
    const latitude = Number(place.latitude), longitude = Number(place.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      el('venue-candidates').innerHTML = '<div style="margin-top:10px;color:#fca5a5;font-size:12px">Google Maps could not return a location for this result. Please choose another pub result.</div>';
      return;
    }
    const { data, error } = await mapSb.from('drinking_sessions').insert([{ user_email: user.email, group_code: selectedGroupCode || null, google_place_id: place.id, venue_name: place.name, venue_address: place.address || null, latitude, longitude }]).select().single();
    if (error) { el('venue-candidates').innerHTML = `<div style="margin-top:10px;color:#fca5a5;font-size:12px">${esc(error.message)}</div>`; return; }
    activeSession = data;
    el('drinking-venue-search').value = '';
    el('venue-candidates').innerHTML = `<div class="checkin-status">✓ Checked in at <strong>${esc(place.name)}</strong></div>`;
    await loadActiveSession();
  }

  async function endDrinkingSession(silent = false) {
    if (!activeSession) return;
    const { error } = await mapSb.from('drinking_sessions').update({ ended_at: new Date().toISOString() }).eq('id', activeSession.id);
    if (error && !silent) alert(error.message);
    activeSession = null; await loadActiveSession();
  }

  async function recordDrinkEvent(type, delta, logDate) {
    if (!activeSession || !delta) return;
    const user = await currentUser(); if (!user) return;
    const { error } = await mapSb.from('drink_location_events').insert([{ session_id: activeSession.id, user_email: user.email, group_code: activeSession.group_code, log_date: logDate, drink_type: type, delta }]);
    if (error) console.error('Drinking map event failed:', error);
  }

  function installHooks() {
    if (typeof window.adjustDrink === 'function' && !window.__howManyMapDrinkHook) {
      const original = window.adjustDrink;
      window.adjustDrink = async function(type, delta) {
        const c = el(`cnt-${type}`), before = Number(c?.innerText || 0); await original(type, delta); const after = Number(c?.innerText || 0);
        if (after === before + delta) await recordDrinkEvent(type, delta, el('today-date-label')?.innerText || new Date().toISOString().slice(0, 10));
      };
      window.__howManyMapDrinkHook = true;
    }
    if (typeof window.switchPage === 'function' && !window.__howManyMapPageHook) {
      const original = window.switchPage;
      window.switchPage = function(page) {
        if (page === 'pub' || page === 'map') {
          ['page-account', 'page-tracker', 'page-stats', 'page-admin'].forEach(id => el(id)?.classList.add('hidden'));
          el('drinking-map-page')?.classList.remove('hidden');
          document.querySelectorAll('#app-screen nav button').forEach(b => b.classList.toggle('active', b.id === 'nav-pub'));
          populateGroups().then(loadActiveSession); setTimeout(() => el('drinking-venue-search')?.focus(), 50); return;
        }
        el('drinking-map-page')?.classList.add('hidden'); original(page);
      };
      window.__howManyMapPageHook = true;
    }
    installTrackerCheckInButton();
  }

  function installTrackerCheckInButton() {
    const tracker = el('page-tracker'); if (!tracker || el('tracker-check-in-btn')) return;
    const card = tracker.querySelector('.card'); if (!card) return;
    const button = document.createElement('button'); button.id = 'tracker-check-in-btn'; button.className = 'btn-submit checkin-button'; button.textContent = '📍 Check in at a pub'; button.onclick = () => switchPage('pub'); card.appendChild(button);
  }

  async function populateGroups() {
    const user = await currentUser(); if (!user) return;
    const { data } = await mapSb.from('group_members').select('group_code,groups(name)').eq('user_email', user.email);
    const s = el('drinking-map-group-select'); if (!s) return;
    (data || []).forEach(g => { if (![...s.options].some(o => o.value === g.group_code)) { const o = document.createElement('option'); o.value = g.group_code; o.textContent = g.groups?.name || g.group_code; s.appendChild(o); } });
    s.value = selectedGroupCode || '';
  }

  function init() { addStyles(); addPage(); installHooks(); setTimeout(installHooks, 500); setTimeout(installHooks, 1500); }
  window.setDrinkingLocation = searchDrinkingVenues; window.searchDrinkingVenues = searchDrinkingVenues; window.confirmDrinkingVenue = confirmDrinkingVenue; window.endDrinkingSession = endDrinkingSession;
  init();
})();