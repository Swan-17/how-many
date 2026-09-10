/* How Many Beers - Top Venues stats + map */
(function () {
  const sb = window.__HOW_MANY_SUPABASE__;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const beerEquivalent = (type, delta) => ({pints:1,bottles:.6,wines:.7,cocktails:.8,shots:.4}[type] || 0) * (Number(delta) || 0);
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
      #top-venues-map-page { min-height: 60vh; }
      #top-venues-map-page .top-map-title { margin: 0; font-size: 16px; color: var(--primary-color); text-align:center; }
      #top-venues-map { height: 430px; margin-top: 14px; border: 1px solid var(--border-color); border-radius:10px; overflow:hidden; background:var(--bg-main); }
      .top-venue-popup strong { color:#111827; }
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
      <div class="card">
        <h3 class="top-map-title">📍 TOP VENUES</h3>
        <div id="top-venues-map"></div>
        <div style="margin:24px 0 0;">
          <button type="button" class="btn-secondary" style="width:100%;padding:12px;font-size:14px;" id="top-venues-back-stats">Back to Stats</button>
        </div>
      </div>`;
    app.appendChild(page);
    $('top-venues-back-stats').addEventListener('click', () => returnToStatsPage());
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
    return card;
  }

  function toggleTopVenues() {
    const body = $('top-venues-body'), chevron = $('top-venues-chevron'), toggle = $('top-venues-toggle');
    if (!body) return;
    const hidden = body.classList.toggle('hidden');
    if (chevron) chevron.textContent = hidden ? '▼' : '▲';
    if (toggle) toggle.setAttribute('aria-expanded', String(!hidden));
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
      list.innerHTML = venues.map((v,i) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color)"><div style="min-width:0"><div style="font-weight:800;font-size:13px">${i+1}. ${esc(v.name)}</div>${v.address ? `<div style="color:var(--text-muted);font-size:10px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(v.address)}</div>` : ''}</div><strong style="color:var(--primary-color);white-space:nowrap">${v.drinks.toFixed(1)} beers</strong></div>`).join('');
      const hasMapPoints = venues.some(v => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));
      $('show-venues-map-btn')?.classList.toggle('hidden', !hasMapPoints);
    } catch (e) {
      list.innerHTML = `<div style="color:#fca5a5;font-size:12px;padding:10px 0">${esc(e.message || 'Could not load venues.')}</div>`;
    } finally { loading = false; }
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (window.__howManyLeafletPromise) return window.__howManyLeafletPromise;
    window.__howManyLeafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load the map library.'));
      document.head.appendChild(script);
    });
    return window.__howManyLeafletPromise;
  }

  async function openTopVenuesMapPage() {
    const points = venues.filter(v => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));
    if (!points.length) return;
    const mapPage = ensureMapPage();
    if (!mapPage) return;
    try {
      await loadLeaflet();
      ['account','tracker','stats','admin'].forEach(page => $(`page-${page}`)?.classList.add('hidden'));
      ['account','tracker','stats','admin'].forEach(page => $(`nav-${page}`)?.classList.remove('active'));
      const nav = document.querySelector('nav');
      if (nav) nav.classList.add('hidden');
      mapPage.classList.remove('hidden');

      const mapEl = $('top-venues-map');
      if (!mapInstance) {
        mapInstance = window.L.map(mapEl, {scrollWheelZoom:false});
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; OpenStreetMap contributors'}).addTo(mapInstance);
      }
      mapMarkers.forEach(marker => marker.remove());
      mapMarkers = points.map(v => window.L.marker([v.latitude, v.longitude]).addTo(mapInstance).bindPopup(`<div class="top-venue-popup"><strong>${esc(v.name)}</strong><br>${v.drinks.toFixed(1)} beers${v.address ? `<br><small>${esc(v.address)}</small>` : ''}</div>`));
      const bounds = window.L.latLngBounds(points.map(v => [v.latitude, v.longitude]));
      mapInstance.fitBounds(bounds, {padding:[25,25], maxZoom:15});
      setTimeout(() => mapInstance.invalidateSize(), 50);
      window.scrollTo({top:0, behavior:'smooth'});
    } catch (e) {
      alert(e.message || 'Could not open the map.');
    }
  }

  function returnToStatsPage() {
    const mapPage = $('top-venues-map-page');
    mapPage?.classList.add('hidden');
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
