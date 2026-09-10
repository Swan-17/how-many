/* How Many Beers - Drinking map test feature: tracker pub check-in */
(function () {
  const MAP_SUPABASE_URL = 'https://tmwmsmkivxyenulifmdk.supabase.co';
  const MAP_SUPABASE_KEY = 'sb_publishable_Up-QZhkzCGzgO59fyF-zag_K7PSpYmU';
  const mapSb = supabase.createClient(MAP_SUPABASE_URL, MAP_SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const MAP_FUNCTION_URL = `${MAP_SUPABASE_URL}/functions/v1/find-nearby-venues`;
  let activeSession = null, venueCandidates = [], searchTimer = null;
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
      #drinking-map-page .checkin-status{margin-top:12px;padding:14px;border-radius:9px;background:var(--bg-main);border:1px solid var(--primary-color);font-size:13px;text-align:center}
      #drinking-map-page .checkin-status .venue-name{font-size:17px;margin:3px 0}
      #drinking-map-page .checkin-button{width:100%;padding:13px;font-size:14px;margin-top:16px}
      #drinking-map-page .checkout-button{width:100%;margin-top:12px}
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
        <div id="active-drinking-location"></div>
        <div id="drinking-checkin-form">
          <p class="pub-subtitle">Where are you drinking?</p>
          <div class="pub-search-wrap">
            <input id="drinking-venue-search" type="search" placeholder="Search for your pub…" autocomplete="off" aria-label="Search for your pub">
          </div>
          <div id="venue-candidates"></div>
        </div>
      </div>
    `;
    el('app-screen')?.appendChild(page);
    el('drinking-venue-search')?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const value = el('drinking-venue-search').value.trim();
      if (!value) { el('venue-candidates').innerHTML = ''; return; }
      searchTimer = setTimeout(searchDrinkingVenues, 350);
    });
    el('drinking-venue-search')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { clearTimeout(searchTimer); searchDrinkingVenues(); }
    });
  }

  async function loadActiveSession() {
    const user = await currentUser();
    if (!user) return;
    const { data } = await mapSb.from('drinking_sessions').select('*').eq('user_email', user.email).is('ended_at', null).order('started_at', { ascending: false }).limit(1).maybeSingle();
    activeSession = data || null;
    renderCheckinState();
    syncTrackerCheckInButton();
    return activeSession;
  }

  function renderCheckinState() {
    const active = el('active-drinking-location'), form = el('drinking-checkin-form');
    if (!active || !form) return;
    if (activeSession) {
      active.innerHTML = `
        <div class="checkin-status">
          <div>✓ Checked in at</div>
          <div class="venue-name"><strong>${esc(activeSession.venue_name)}</strong></div>
          ${activeSession.venue_address ? `<small>${esc(activeSession.venue_address)}</small>` : ''}
          <button class="btn-secondary checkout-button" onclick="endDrinkingSession()">Check out</button>
        </div>`;
      form.classList.add('hidden');
    } else {
      active.innerHTML = '';
      form.classList.remove('hidden');
      if (el('drinking-venue-search')) setTimeout(() => el('drinking-venue-search').focus(), 50);
    }
    syncTrackerCheckInButton();
  }

  function openDrinkingCheckIn() {
    el('drinking-map-page')?.classList.remove('hidden');
    loadActiveSession();
    setTimeout(() => el('drinking-venue-search')?.focus(), 50);
  }

  function syncTrackerCheckInButton() {
    const button = el('tracker-check-in-btn');
    if (!button) return;
    button.classList.toggle('hidden', !!activeSession);
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
    const { data, error } = await mapSb.from('drinking_sessions').insert([{ user_email: user.email, group_code: null, google_place_id: place.id, venue_name: place.name, venue_address: place.address || null, latitude, longitude }]).select().single();
    if (error) { el('venue-candidates').innerHTML = `<div style="margin-top:10px;color:#fca5a5;font-size:12px">${esc(error.message)}</div>`; return; }
    activeSession = data;
    el('drinking-venue-search').value = '';
    venueCandidates = [];
    el('venue-candidates').innerHTML = '';
    renderCheckinState();
  }

  async function endDrinkingSession(silent = false) {
    if (!activeSession) {
      await loadActiveSession();
      if (!activeSession) return;
    }
    const { error } = await mapSb.from('drinking_sessions').update({ ended_at: new Date().toISOString() }).eq('id', activeSession.id);
    if (error) { if (!silent) alert(error.message); return; }
    activeSession = null;
    renderCheckinState();
    syncTrackerCheckInButton();
  }

  async function recordDrinkEvent(type, delta, logDate) {
    if (!activeSession || !delta) return;
    const user = await currentUser(); if (!user) return;
    const { error } = await mapSb.from('drink_location_events').insert([{ session_id: activeSession.id, user_email: user.email, group_code: null, log_date: logDate, drink_type: type, delta }]);
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
          ['page-account', 'page-stats', 'page-admin'].forEach(id => el(id)?.classList.add('hidden'));
          el('page-tracker')?.classList.remove('hidden');
          el('drinking-map-page')?.classList.remove('hidden');
          document.querySelectorAll('#app-screen nav button').forEach(b => b.classList.toggle('active', false));
          loadActiveSession(); return;
        }
        el('drinking-map-page')?.classList.add('hidden'); original(page);
      };
      window.__howManyMapPageHook = true;
    }
    installTrackerCheckInButton();
  }

  function installTrackerCheckInButton() {
    const tracker = el('page-tracker'); if (!tracker) return;
    let button = el('tracker-check-in-btn');
    if (!button) {
      const card = tracker.querySelector('.card'); if (!card) return;
      button = document.createElement('button');
      button.id = 'tracker-check-in-btn';
      button.className = 'btn-submit checkin-button';
      button.textContent = '📍 Check in at a pub';
      card.appendChild(button);
    }
    button.onclick = openDrinkingCheckIn;
    syncTrackerCheckInButton();
  }

  function init() { addStyles(); addPage(); installHooks(); setTimeout(installHooks, 500); setTimeout(installHooks, 1500); }
  window.setDrinkingLocation = searchDrinkingVenues;
  window.searchDrinkingVenues = searchDrinkingVenues;
  window.confirmDrinkingVenue = confirmDrinkingVenue;
  window.endDrinkingSession = endDrinkingSession;
  window.loadActiveDrinkingSession = loadActiveSession;
  window.openDrinkingCheckIn = openDrinkingCheckIn;
  window.syncDrinkingCheckInButton = syncTrackerCheckInButton;
  init();
})();
