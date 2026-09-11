/* How Many Beers - Top Venues stats + map */
(function () {
  const sb = window.__HOW_MANY_SUPABASE__;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const beerEquivalent = (type, delta) => ({pints:1,bottles:.6,wines:.7,cocktails:.8,shots:.4}[type] || 0) * (Number(delta) || 0);
  const wholeBeers = value => Math.round(Number(value) || 0);
  let venues = [], loading = false, mapInstance = null, mapMarkers = [];

  function addStyles() {
    if ($('top-venues-styles')) return;
    const style = document.createElement('style');
    style.id = 'top-venues-styles';
    style.textContent = `
      #top-venues-card { padding: 0; overflow: hidden; }
      #top-venues-toggle { width: 100%; border: 0; background: transparent; color: var(--text-muted); padding: 15px 16px; display:flex; align-items:center; justify-content:space-between; font:700 15px inherit; cursor:pointer; text-align:left; }
      #top-venues-toggle span:last-child { color:var(--primary-color); font-size:13px; }
      #top-venues-body { padding: 0 16px 16px; border-top: 1px solid var(--border-color); }
      #top-venues-list { margin-top: 4px; }
      #top-venues-list > div:last-child { border-bottom: none !important; }
      #top-venues-map-page { position:fixed; inset:0; z-index:9999; min-height:100dvh; height:100dvh; width:100%; background:var(--bg-main); overflow:hidden; padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom); box-sizing:border-box; }
      #top-venues-map-page.top-map-preloading { display:block !important; visibility:hidden; pointer-events:none; opacity:0; }
      #top-venues-map-page .top-map-shell { height:100%; min-height:0; display:flex; flex-direction:column; }
      #top-venues-map-page .top-map-title { flex:0 0 auto; margin:0; padding:10px 14px 8px; font-size:16px; color:var(--primary-color); text-align:center; }
      #top-venues-map-wrap { flex:1 1 auto; min-height:0; padding:0 10px; box-sizing:border-box; }
      #top-venues-map { height:100%; width:100%; border:1px solid var(--border-color); border-radius:10px; overflow:hidden; background:var(--bg-main); touch-action:none; }
      #top-venues-map-page .top-map-footer { flex:0 0 auto; padding:10px 10px calc(10px + env(safe-area-inset-bottom)); box-sizing:border-box; background:var(--bg-main); }
      #top-venues-map-page #top-venues-back-stats { width:100%; padding:13px; font-size:14px; min-height:48px; }
      .top-venue-marker-wrap { display:flex; align-items:center; justify-content:center; width:40px; height:40px; }
      .top-venue-marker { width:34px; height:34px; border-radius:50% 50% 50% 7px; transform:rotate(-45deg); display:grid; place-items:center; box-sizing:border-box; background:linear-gradient(145deg,#ffd166 0%,#f59e0b 58%,#b45309 100%); border:3px solid rgba(255,255,255,.96); box-shadow:0 4px 10px rgba(0,0,0,.25); }
      .top-venue-marker span { transform:rotate(45deg); font-size:17px; line-height:1; }
      .top-venue-popup { min-width:150px; font-size:12px; line-height:1.4; }
      .top-venue-popup strong { color:#111827; font-size:13px; }
      .top-venue-popup .beer-count { color:#b45309; font-weight:800; }
      .top-venue-popup small { color:#6b7280; }
    `;
    document.head.appendChild(style);
  }

  function findPersonalHighlightsCard() {
    const page = $('page-stats');
    if (!page) return null;
    return [...page.querySelectorAll('.card')].find(card => {
      const heading = card.querySelector('h3');
      return heading && heading.textContent.includes('PERSONAL ACHIEVEMENTS & HIGHLIGHTS');
    }) || null;
  }

  function ensureMapPage() {
    let page = $('top-venues-map-page');
    if (page) return page;
    const app = $('app-screen');
    if (!app) return null;
    page = document.createElement('div');
    page.id = 'top-venues-map-page';
    page.className = 'hidden';
    page.innerHTML = `
      <div class="top-map-shell">
        <h3 class="top-map-title">📍 TOP VENUES</h3>
        <div id="top-venues-map-wrap"><div id="top-venues-map"></div></div>
        <div class="top-map-footer">
          <button type="button" class="btn-secondary" id="top-venues-back-stats">Back to Stats</button>
        </div>
      </div>`;
    app.appendChild(page);
    $('top-venues-back-stats').addEventListener('click', returnToStatsPage);
    return page;
  }

  function ensureCard() {
    const page = $('page-stats');
    if (!page) return null;
    let card = $('top-venues-card');
    if (card) return card;
    card = document.createElement('div');
    card.id = 'top-venues-card';
    card.className = 'card';
    card.innerHTML = `
      <button type="button" id="top-venues-toggle" aria-expanded="false">
        <span>📍 TOP VENUES</span><span id="top-venues-chevron">▼</span>
      </button>
      <div id="top-venues-body" class="hidden">
        <div id="top-venues-list"></div>
        <button type="button" id="show-venues-map-btn" class="btn-submit hidden">📍 Show on Map</button>
      </div>`;
    const highlights = findPersonalHighlightsCard();
    if (highlights) page.insertBefore(card, highlights); else page.appendChild(card);
    $('top-venues-toggle').addEventListener('click', toggleTopVenues);
    $('show-venues-map-btn').addEventListener('click', openTopVenuesMapPage);
    addStyles();
    ensureMapPage();
    installAutoCollapse();
    return card;
  }

  function toggleTopVenues() {
    const body = $('top-venues-body'), chevron = $('top-venues-chevron'), toggle = $('top-venues-toggle');
    if (!body) return;
    const hidden = body.classList.toggle('hidden');
    if (chevron) chevron.textContent = hidden ? '▼' : '▲';
    if (toggle) toggle.setAttribute('aria-expanded', String(!hidden));
  }

  function collapseTopVenues() {
    const body = $('top-venues-body'), chevron = $('top-venues-chevron'), toggle = $('top-venues-toggle');
    if (!body || body.classList.contains('hidden')) return;
    body.classList.add('hidden');
    if (chevron) chevron.textContent = '▼';
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function installAutoCollapse() {
    if (document.__topVenuesAutoCollapse) return;
    document.__topVenuesAutoCollapse = true;
    document.addEventListener('click', event => {
      const card = $('top-venues-card');
      if (!card || card.contains(event.target)) return;
      const interactive = event.target.closest('button, a, select, input, textarea, [role="button"]');
      if (interactive) collapseTopVenues();
    }, true);
    document.addEventListener('focusin', event => {
      const card = $('top-venues-card');
      if (!card || card.contains(event.target)) return;
      if (event.target.closest('button, a, select, input, textarea, [role="button"]')) collapseTopVenues();
    }, true);
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

  function logDateKey(value) {
    const text = String(value || '').trim();
    const match = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    return match ? match[1] : text.slice(0, 10);
  }

  function beerTotalFromLog(log) {
    return Object.entries({pints:log?.pints,bottles:log?.bottles,wines:log?.wines,cocktails:log?.cocktails,shots:log?.shots})
      .reduce((sum, [type, value]) => sum + beerEquivalent(type, value), 0);
  }

  async function loadLegacyDrinkFallback(emails, sessions) {
    if (!emails.length || !sessions.length) return {};
    const { data: logs, error } = await sb.from('drink_logs').select('user_email,log_date,pints,bottles,wines,cocktails,shots').in('user_email', emails);
    if (error) throw error;
    const sessionsByEmailDate = {};
    (sessions || []).forEach(session => {
      const email = String(session.user_email || '').toLowerCase().trim();
      const started = String(session.started_at || '').slice(0, 10);
      const ended = session.ended_at ? String(session.ended_at).slice(0, 10) : null;
      if (!email || !started) return;
      const dates = [];
      if (!ended || ended === started) dates.push(started);
      else {
        const start = new Date(`${started}T12:00:00`), finish = new Date(`${ended}T12:00:00`);
        for (let cursor = new Date(start); cursor <= finish; cursor.setDate(cursor.getDate() + 1)) dates.push(cursor.toISOString().slice(0, 10));
      }
      dates.forEach(date => { const key = `${email}|${date}`; (sessionsByEmailDate[key] ||= []).push(session); });
    });
    const fallback = {};
    (logs || []).forEach(log => {
      const email = String(log.user_email || '').toLowerCase().trim();
      const date = logDateKey(log.log_date);
      const matchingSessions = sessionsByEmailDate[`${email}|${date}`] || [];
      if (matchingSessions.length !== 1) return;
      const session = matchingSessions[0], amount = beerTotalFromLog(log);
      if (!amount) return;
      fallback[session.id] = (fallback[session.id] || 0) + amount;
    });
    return fallback;
  }

  async function loadTopVenues() {
    const card = ensureCard(), select = $('analytics-group-select'), list = $('top-venues-list');
    if (!card || !select || !list || loading) return;
    loading = true;
    list.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:10px 0">Loading venues…</div>';
    try {
      if (!sb) throw new Error('Stats connection unavailable.');
      const emails = await emailsForScope(select.value);
      if (!emails.length) { list.textContent = 'No people found for this stats view.'; return; }
      const { data: sessions, error: se } = await sb.from('drinking_sessions').select('id,user_email,venue_name,venue_address,latitude,longitude,started_at,ended_at').in('user_email', emails);
      if (se) throw se;
      const ids = (sessions || []).map(x => x.id).filter(Boolean);
      if (!ids.length) { list.textContent = 'No venues visited yet.'; return; }
      const { data: events, error: ee } = await sb.from('drink_location_events').select('session_id,drink_type,delta').in('session_id', ids);
      if (ee) throw ee;
      const totals = {};
      (events || []).forEach(e => totals[e.session_id] = (totals[e.session_id] || 0) + beerEquivalent(e.drink_type, e.delta));
      try {
        const legacyFallback = await Promise.race([
          loadLegacyDrinkFallback(emails, sessions || []),
          new Promise(resolve => setTimeout(() => resolve({}), 4000))
        ]);
        Object.entries(legacyFallback || {}).forEach(([sessionId, amount]) => { if (!(sessionId in totals) || !totals[sessionId]) totals[sessionId] = amount; });
      } catch (_) {}
      const grouped = {};
      (sessions || []).forEach(s => {
        const name = s.venue_name || 'Unknown venue', key = name + '|' + (s.venue_address || '');
        if (!grouped[key]) grouped[key] = {name, address:s.venue_address || '', drinks:0, latitude:Number(s.latitude), longitude:Number(s.longitude)};
        grouped[key].drinks += totals[s.id] || 0;
      });
      venues = Object.values(grouped).filter(v => v.drinks > 0).sort((a,b) => b.drinks - a.drinks || a.name.localeCompare(b.name));
      if (!venues.length) {
        list.textContent = 'No beers have been recorded at a venue yet.';
        $('show-venues-map-btn')?.classList.add('hidden');
        return;
      }
      list.innerHTML = venues.map((v,i) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color)"><div style="min-width:0"><div style="font-weight:800;font-size:13px">${i+1}. ${esc(v.name)}</div>${v.address ? `<div style="color:var(--text-muted);font-size:10px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(v.address)}</div>` : ''}</div><strong style="color:var(--primary-color);white-space:nowrap">${wholeBeers(v.drinks)} Beers</strong></div>`).join('');
      const points = venues.filter(v => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));
      $('show-venues-map-btn')?.classList.toggle('hidden', !points.length);
      primeMap(points);
    } catch (e) {
      list.innerHTML = `<div style="color:#fca5a5;font-size:12px;padding:10px 0">${esc(e.message || 'Could not load venues.')}</div>`;
    } finally { loading = false; }
  }

  function loadMapLibre() {
    if (window.maplibregl) return Promise.resolve();
    if (window.__howManyMapLibrePromise) return window.__howManyMapLibrePromise;
    window.__howManyMapLibrePromise = new Promise((resolve, reject) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'; document.head.appendChild(css);
      const script = document.createElement('script'); script.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'; script.onload = resolve; script.onerror = () => reject(new Error('Could not load map library.')); document.head.appendChild(script);
    });
    return window.__howManyMapLibrePromise;
  }

  function beerMarkerElement() {
    const wrap = document.createElement('div'); wrap.className = 'top-venue-marker-wrap'; wrap.innerHTML = '<div class="top-venue-marker"><span>🍺</span></div>'; return wrap;
  }

  async function createMapForPoints(points) {
    const page = ensureMapPage(), container = $('top-venues-map');
    if (!page || !container || !points.length) return;
    await loadMapLibre();
    if (mapInstance) return;
    mapInstance = new window.maplibregl.Map({container, style:'https://demotiles.maplibre.org/style.json', center:[points[0].longitude,points[0].latitude], zoom:13, attributionControl:true});
    await new Promise((resolve, reject) => { mapInstance.once('load', resolve); mapInstance.once('error', event => reject(event?.error || new Error('Map failed to load.'))); });
  }

  async function primeMap(points) {
    if (!points.length) return;
    try {
      await createMapForPoints(points);
      if (!mapInstance) return;
      mapMarkers.forEach(marker => marker.remove());
      mapMarkers = points.map(v => new window.maplibregl.Marker({element:beerMarkerElement(),anchor:'bottom'}).setLngLat([v.longitude,v.latitude]).setPopup(new window.maplibregl.Popup({offset:18}).setHTML(`<div class="top-venue-popup"><strong>${esc(v.name)}</strong><br><span class="beer-count">${wholeBeers(v.drinks)} Beers</span>${v.address ? `<br><small>${esc(v.address)}</small>` : ''}</div>`)).addTo(mapInstance));
      const bounds = new window.maplibregl.LngLatBounds(); points.forEach(v => bounds.extend([v.longitude,v.latitude]));
      if (points.length === 1) mapInstance.jumpTo({center:[points[0].longitude,points[0].latitude],zoom:14}); else mapInstance.fitBounds(bounds,{padding:50,maxZoom:15});
    } catch (e) { console.warn('Top Venues map preload failed:', e.message); }
  }

  function openTopVenuesMapPage() {
    const page = ensureMapPage(); if (!page) return;
    ['page-tracker','page-stats','page-account','page-admin'].forEach(id => $(id)?.classList.add('hidden'));
    page.classList.remove('hidden');
    requestAnimationFrame(() => { if (mapInstance) mapInstance.resize(); });
  }

  function returnToStatsPage() {
    const page = $('top-venues-map-page');
    page?.classList.add('hidden');
    $('app-screen')?.classList.remove('hidden');
    ['page-tracker','page-account','page-admin'].forEach(id => $(id)?.classList.add('hidden'));
    $('page-stats')?.classList.remove('hidden');
    document.querySelector('nav')?.classList.remove('hidden');
    document.querySelectorAll('nav button').forEach(button => button.classList.remove('active'));
    $('nav-stats')?.classList.add('active');
    try { localStorage.setItem('dt_last_page', 'stats'); } catch (_) {}
    if (typeof window.renderAnalytics === 'function') setTimeout(() => window.renderAnalytics(), 0);
  }

  function install() {
    if (!$('page-stats')) return;
    ensureCard();
    const select = $('analytics-group-select');
    if (!window.__topVenuesSelectHook && select) { select.addEventListener('change', loadTopVenues); window.__topVenuesSelectHook = true; }
    if (!window.__topVenuesStatsObserver && window.MutationObserver && select) {
      const observer = new MutationObserver(() => {
        if (!$('page-stats')?.classList.contains('hidden') && select.value) loadTopVenues();
      });
      observer.observe(select, {childList:true, subtree:true});
      window.__topVenuesStatsObserver = true;
    }
    if (select?.value) loadTopVenues();
  }

  window.loadTopVenues = loadTopVenues;
  const timer = setInterval(() => { install(); if ($('page-stats') && $('page-tracker')) clearInterval(timer); }, 300);
  setTimeout(() => clearInterval(timer), 20000);
  install();
})();
