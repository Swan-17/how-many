/* How Many Beers - Top Venues stats + map */
(function () {
  const sb = window.__HOW_MANY_SUPABASE__;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
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
      #top-venues-map-page .top-map-shell { height:100%; min-height:0; display:flex; flex-direction:column; }
      #top-venues-map-page .top-map-title { flex:0 0 auto; margin:0; padding:10px 14px 8px; font-size:16px; color:var(--primary-color); text-align:center; }
      #top-venues-map-wrap { flex:1 1 auto; min-height:0; padding:0 10px; box-sizing:border-box; }
      #top-venues-map { height:100%; width:100%; border:1px solid var(--border-color); border-radius:10px; overflow:hidden; background:var(--bg-main); }
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
    if (highlights) page.insertBefore(card, highlights);
    else page.appendChild(card);

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

  async function loadTopVenues() {
    const card = ensureCard(), select = $('analytics-group-select'), list = $('top-venues-list');
    if (!card || !select || !list || loading) return;
    loading = true;
    list.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:10px 0">Loading venues…</div>';
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
      if (!venues.length) {
        list.textContent = 'No beers have been recorded at a venue yet.';
        $('show-venues-map-btn')?.classList.add('hidden');
        return;
      }
      list.innerHTML = venues.map((v,i) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color)"><div style="min-width:0"><div style="font-weight:800;font-size:13px">${i+1}. ${esc(v.name)}</div>${v.address ? `<div style="color:var(--text-muted);font-size:10px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(v.address)}</div>` : ''}</div><strong style="color:var(--primary-color);white-space:nowrap">${wholeBeers(v.drinks)} beers</strong></div>`).join('');
      const hasMapPoints = venues.some(v => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));
      $('show-venues-map-btn')?.classList.toggle('hidden', !hasMapPoints);
    } catch (e) {
      list.innerHTML = `<div style="color:#fca5a5;font-size:12px;padding:10px 0">${esc(e.message || 'Could not load venues.')}</div>`;
    } finally { loading = false; }
  }

  function loadMapLibre() {
    if (window.maplibregl) return Promise.resolve();
    if (window.__howManyMapLibrePromise) return window.__howManyMapLibrePromise;
    window.__howManyMapLibrePromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css';
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load the map library.'));
      document.head.appendChild(script);
    });
    return window.__howManyMapLibrePromise;
  }

  function beerMarkerElement() {
    const wrap = document.createElement('div');
    wrap.className = 'top-venue-marker-wrap';
    wrap.innerHTML = '<div class="top-venue-marker" aria-label="Beer venue marker"><span>🍺</span></div>';
    return wrap;
  }

  async function openTopVenuesMapPage() {
    const points = venues.filter(v => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));
    if (!points.length) return;
    const mapPage = ensureMapPage();
    if (!mapPage) return;
    try {
      collapseTopVenues();
      await loadMapLibre();
      ['account','tracker','stats','admin'].forEach(page => $(`page-${page}`)?.classList.add('hidden'));
      ['account','tracker','stats','admin'].forEach(page => $(`nav-${page}`)?.classList.remove('active'));
      const nav = document.querySelector('nav');
      if (nav) nav.classList.add('hidden');
      mapPage.classList.remove('hidden');
      document.body.classList.add('top-venues-map-open');

      const mapEl = $('top-venues-map');
      if (!mapInstance) {
        mapInstance = new window.maplibregl.Map({
          container: mapEl,
          style: 'https://tiles.openfreemap.org/styles/positron',
          center: [points[0].longitude, points[0].latitude],
          zoom: 12,
          attributionControl: true,
          cooperativeGestures: true
        });
        mapInstance.addControl(new window.maplibregl.NavigationControl({showCompass:false}), 'top-right');
        await new Promise(resolve => mapInstance.once('load', resolve));
      }

      mapMarkers.forEach(marker => marker.remove());
      mapMarkers = points.map(v => {
        const marker = new window.maplibregl.Marker({element: beerMarkerElement(), anchor:'bottom'})
          .setLngLat([v.longitude, v.latitude])
          .setPopup(new window.maplibregl.Popup({offset:18}).setHTML(`<div class="top-venue-popup"><strong>${esc(v.name)}</strong><br><span class="beer-count">${wholeBeers(v.drinks)} beers</span>${v.address ? `<br><small>${esc(v.address)}</small>` : ''}</div>`))
          .addTo(mapInstance);
        return marker;
      });

      const bounds = new window.maplibregl.LngLatBounds();
      points.forEach(v => bounds.extend([v.longitude, v.latitude]));
      if (points.length === 1) mapInstance.easeTo({center:[points[0].longitude, points[0].latitude], zoom:14, duration:350});
      else mapInstance.fitBounds(bounds, {padding:50, maxZoom:15, duration:350});
      mapInstance.resize();
      window.scrollTo({top:0, behavior:'smooth'});
    } catch (e) {
      alert(e.message || 'Could not open the map.');
    }
  }

  function returnToStatsPage() {
    const mapPage = $('top-venues-map-page');
    mapPage?.classList.add('hidden');
    document.body.classList.remove('top-venues-map-open');
    const nav = document.querySelector('nav');
    if (nav) nav.classList.remove('hidden');
    if (typeof window.switchPage === 'function') window.switchPage('stats');
    else $('page-stats')?.classList.remove('hidden');
  }

  function install() {
    const card = ensureCard(), select = $('analytics-group-select');
    if (!card || !select) return;
    card.classList.remove('hidden');
    if (!select.__topVenuesBound) {
      select.addEventListener('change', () => { loadTopVenues(); });
      select.__topVenuesBound = true;
    }
    if (!card.__initialLoad && select.value) { card.__initialLoad = true; loadTopVenues(); }
  }

  window.loadTopVenues = loadTopVenues;
  window.showTopVenuesMap = openTopVenuesMapPage;
  window.openTopVenuesMapPage = openTopVenuesMapPage;
  window.returnToStatsPage = returnToStatsPage;
  const timer = setInterval(install, 300);
  setTimeout(() => clearInterval(timer), 30000);
  install();
})();
