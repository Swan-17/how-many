/* How Many Beers - tracker pub check-in */
(function () {
  const MAP_SUPABASE_URL = 'https://tmwmsmkivxyenulifmdk.supabase.co';
  const MAP_SUPABASE_KEY = 'sb_publishable_Up-QZhkzCGzgO59fyF-zag_K7PSpYmU';
  const mapSb = supabase.createClient(MAP_SUPABASE_URL, MAP_SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const MAP_FUNCTION_URL = `${MAP_SUPABASE_URL}/functions/v1/find-nearby-venues`;

  let activeSession = null;
  let venueCandidates = [];
  let searchTimer = null;
  let trackerCard = null;
  let trackerSearchOpen = false;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\'\"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));

  async function currentUser() {
    const { data } = await mapSb.auth.getSession();
    return data?.session?.user || null;
  }

  function addStyles() {
    if ($('drinking-map-styles')) return;
    const style = document.createElement('style');
    style.id = 'drinking-map-styles';
    style.textContent = `
      #tracker-check-in-card { margin-top: 16px; }
      #tracker-check-in-card .pub-title { margin: 0 0 6px; font-size: 17px; }
      #tracker-check-in-card .pub-subtitle { margin: 0 0 10px; color: var(--text-muted); font-size: 12px; }
      #tracker-check-in-card .tracker-checkin-status { padding: 12px; border: 1px solid var(--primary-color); border-radius: 9px; background: var(--bg-main); text-align: center; }
      #tracker-check-in-card .tracker-venue-name { margin: 3px 0; font-size: 16px; font-weight: 800; }
      #tracker-check-in-card .tracker-venue-address { display: block; margin-top: 3px; color: var(--text-muted); font-size: 11px; }
      #tracker-check-in-card .tracker-checkout { width: 100%; margin-top: 10px; padding: 11px; }
      #tracker-check-in-card .tracker-checkin-search { margin-top: 10px; }
      #tracker-check-in-card .tracker-venue-result { display: block; width: 100%; margin-top: 8px; padding: 11px; text-align: left; background: var(--bg-main); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; }
      #tracker-check-in-card .tracker-venue-result strong { font-size: 13px; }
      #tracker-check-in-card .tracker-venue-result small { color: var(--text-muted); }
    `;
    document.head.appendChild(style);
  }

  function ensureTrackerCard() {
    const tracker = $('page-tracker');
    if (!tracker) return null;

    let card = $('tracker-check-in-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'tracker-check-in-card';
      card.className = 'card';
      tracker.appendChild(card);
    }
    trackerCard = card;
    renderTrackerCard();
    return card;
  }

  function renderTrackerCard() {
    const card = trackerCard || $('tracker-check-in-card');
    if (!card) return;
    trackerCard = card;

    if (activeSession) {
      card.innerHTML = `
        <div class="tracker-checkin-status">
          <div>✓ Checked in at</div>
          <div class="tracker-venue-name">${esc(activeSession.venue_name)}</div>
          ${activeSession.venue_address ? `<span class="tracker-venue-address">${esc(activeSession.venue_address)}</span>` : ''}
          <button type="button" id="tracker-checkout-btn" class="btn-secondary tracker-checkout">Check out</button>
        </div>`;
      $('tracker-checkout-btn')?.addEventListener('click', endDrinkingSession);
      return;
    }

    card.innerHTML = `
      <button type="button" id="tracker-check-in-btn" class="btn-submit" style="margin-top:0;">📍 Check in at a pub</button>
      <div id="tracker-checkin-search-wrap" class="${trackerSearchOpen ? '' : 'hidden'} tracker-checkin-search">
        <p class="pub-subtitle">Search for your pub</p>
        <input id="drinking-venue-search" type="search" placeholder="Search for your pub…" autocomplete="off" aria-label="Search for your pub">
        <div id="venue-candidates"></div>
      </div>`;

    $('tracker-check-in-btn')?.addEventListener('click', async () => {
      const session = await loadActiveSession();
      if (session) return;
      trackerSearchOpen = true;
      renderTrackerCard();
      setTimeout(() => $('drinking-venue-search')?.focus(), 50);
    });

    $('drinking-venue-search')?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const query = $('drinking-venue-search')?.value.trim();
      if (!query) {
        $('venue-candidates').innerHTML = '';
        return;
      }
      searchTimer = setTimeout(searchDrinkingVenues, 350);
    });

    $('drinking-venue-search')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        clearTimeout(searchTimer);
        searchDrinkingVenues();
      }
    });
  }

  async function loadActiveSession() {
    const user = await currentUser();
    if (!user) {
      activeSession = null;
      renderTrackerCard();
      return null;
    }

    const { data, error } = await mapSb
      .from('drinking_sessions')
      .select('*')
      .eq('user_email', user.email)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) console.warn('Could not load drinking session:', error.message);
    activeSession = data || null;
    trackerSearchOpen = false;
    renderTrackerCard();
    return activeSession;
  }

  async function searchDrinkingVenues() {
    const input = $('drinking-venue-search');
    const output = $('venue-candidates');
    const query = (input?.value || '').trim();
    if (!output || !query) return;

    output.innerHTML = '<div style="margin-top:10px;color:var(--text-muted);font-size:12px">Finding pubs…</div>';

    try {
      const response = await fetch(MAP_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: MAP_SUPABASE_KEY },
        body: JSON.stringify({ query })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || body.message || `Venue search failed (${response.status})`);

      venueCandidates = (body.places || []).map(place => ({
        ...place,
        latitude: place.latitude ?? place.lat ?? place.location?.latitude,
        longitude: place.longitude ?? place.lng ?? place.lon ?? place.location?.longitude
      }));

      output.innerHTML = venueCandidates.length
        ? venueCandidates.slice(0, 6).map((place, index) => `
            <button type="button" class="tracker-venue-result" data-venue-index="${index}">
              <strong>${esc(place.name)}</strong><br>
              <small>${esc(place.address || '')}</small>
            </button>`).join('')
        : '<div style="margin-top:10px;color:var(--text-muted);font-size:12px">No pub found. Try adding the town or area.</div>';

      output.querySelectorAll('[data-venue-index]').forEach(button => {
        button.addEventListener('click', () => confirmDrinkingVenue(Number(button.dataset.venueIndex)));
      });
    } catch (error) {
      output.innerHTML = `<div style="margin-top:10px;color:#fca5a5;font-size:12px">${esc(error.message || 'Could not find that pub.')}</div>`;
    }
  }

  async function confirmDrinkingVenue(index) {
    const place = venueCandidates[index];
    const user = await currentUser();
    if (!place || !user) return;

    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      const output = $('venue-candidates');
      if (output) output.innerHTML = '<div style="margin-top:10px;color:#fca5a5;font-size:12px">Google Maps could not return a location for this result. Please choose another pub result.</div>';
      return;
    }

    if (activeSession) await endDrinkingSession(true);

    const { data, error } = await mapSb.from('drinking_sessions').insert([{
      user_email: user.email,
      group_code: null,
      google_place_id: place.id,
      venue_name: place.name,
      venue_address: place.address || null,
      latitude,
      longitude
    }]).select().single();

    if (error) {
      const output = $('venue-candidates');
      if (output) output.innerHTML = `<div style="margin-top:10px;color:#fca5a5;font-size:12px">${esc(error.message)}</div>`;
      return;
    }

    activeSession = data;
    venueCandidates = [];
    trackerSearchOpen = false;
    renderTrackerCard();
  }

  async function endDrinkingSession(silent = false) {
    if (!activeSession) {
      await loadActiveSession();
      if (!activeSession) return;
    }

    const sessionId = activeSession.id;
    const { error } = await mapSb
      .from('drinking_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      if (!silent) alert(error.message);
      return;
    }

    activeSession = null;
    trackerSearchOpen = false;
    renderTrackerCard();
  }

  async function recordDrinkEvent(type, delta, logDate) {
    if (!activeSession || !delta) return;
    const user = await currentUser();
    if (!user) return;

    const { error } = await mapSb.from('drink_location_events').insert([{
      session_id: activeSession.id,
      user_email: user.email,
      group_code: null,
      log_date: logDate,
      drink_type: type,
      delta
    }]);
    if (error) console.error('Drinking map event failed:', error);
  }

  function installDrinkHook() {
    if (typeof window.adjustDrink !== 'function' || window.__howManyMapDrinkHook) return;
    const originalAdjustDrink = window.adjustDrink;
    window.adjustDrink = async function (type, delta) {
      const count = $(`cnt-${type}`);
      const before = Number(count?.innerText || 0);
      await originalAdjustDrink(type, delta);
      const after = Number(count?.innerText || 0);
      if (after === before + delta) {
        await recordDrinkEvent(type, delta, $('today-date-label')?.innerText || new Date().toISOString().slice(0, 10));
      }
    };
    window.__howManyMapDrinkHook = true;
  }

  function install() {
    addStyles();
    const card = ensureTrackerCard();
    if (card && !card.__sessionRefreshBound) {
      card.__sessionRefreshBound = true;
      loadActiveSession();
    }
    installDrinkHook();
  }

  window.searchDrinkingVenues = searchDrinkingVenues;
  window.setDrinkingLocation = searchDrinkingVenues;
  window.confirmDrinkingVenue = confirmDrinkingVenue;
  window.endDrinkingSession = endDrinkingSession;
  window.loadActiveDrinkingSession = loadActiveSession;
  window.syncDrinkingCheckInButton = ensureTrackerCard;
  window.openDrinkingCheckIn = async function () {
    const session = await loadActiveSession();
    if (session) return;
    trackerSearchOpen = true;
    ensureTrackerCard();
    setTimeout(() => $('drinking-venue-search')?.focus(), 50);
  };

  mapSb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
      setTimeout(() => {
        if (session?.user) loadActiveSession();
        else {
          activeSession = null;
          trackerSearchOpen = false;
          renderTrackerCard();
        }
      }, 0);
    }
  });

  const timer = setInterval(() => {
    if ($('page-tracker')) {
      install();
      if ($('page-stats')) clearInterval(timer);
    }
  }, 200);
  setTimeout(() => clearInterval(timer), 15000);
  install();
})();
