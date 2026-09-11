/* How Many Beers - Top Venues data accuracy + map polish */
(function () {
  const sb = window.__HOW_MANY_SUPABASE__;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const beerEquivalent = (type, delta) => ({ pints: 1, bottles: .6, wines: .7, cocktails: .8, shots: .4 }[type] || 0) * (Number(delta) || 0);
  const wholeBeers = value => Math.round(Number(value) || 0);
  let lastSignature = '';
  let qualityMap = null;
  let qualityMarkers = [];
  let mapPromise = null;
  let rendering = false;

  function addQualityStyles() {
    if ($('top-venues-quality-styles')) return;
    const style = document.createElement('style');
    style.id = 'top-venues-quality-styles';
    style.textContent = `
      #top-venues-quality-map { position:absolute; inset:0; }
      #top-venues-quality-map .maplibregl-ctrl-group { border-radius:10px; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,.18); }
      #top-venues-quality-map .maplibregl-ctrl-group button { width:36px; height:36px; }
      .quality-beer-marker { width:38px; height:46px; position:relative; cursor:pointer; filter:drop-shadow(0 3px 5px rgba(0,0,0,.22)); }
      .quality-beer-marker::before { content:''; position:absolute; left:4px; top:1px; width:30px; height:30px; border-radius:50% 50% 50% 8px; transform:rotate(-45deg); background:linear-gradient(145deg,#f8c44f,#d89416); border:3px solid rgba(255,255,255,.96); box-sizing:border-box; }
      .quality-beer-marker::after { content:''; position:absolute; left:12px; top:8px; width:14px; height:13px; border:2px solid #fff; border-top:0; border-radius:0 0 4px 4px; box-sizing:border-box; transform:rotate(0deg); }
      .quality-beer-marker .foam { position:absolute; left:13px; top:5px; width:12px; height:5px; border-radius:6px; background:#fff; z-index:2; }
      .quality-beer-marker .handle { position:absolute; left:24px; top:9px; width:6px; height:8px; border:2px solid #fff; border-left:0; border-radius:0 5px 5px 0; z-index:2; }
      .quality-popup { min-width:190px; padding:2px; font:13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
      .quality-popup .name { font-weight:800; font-size:14px; color:#111827; }
      .quality-popup .count { margin-top:3px; font-weight:800; color:#b06b08; }
      .quality-popup .address { margin-top:3px; color:#6b7280; font-size:11px; }
      #top-venues-quality-map .maplibregl-popup-content { border-radius:10px; padding:10px 12px; box-shadow:0 5px 20px rgba(0,0,0,.18); }
    `;
    document.head.appendChild(style);
  }

  async function currentEmail() {
    const { data } = await sb.auth.getSession();
    return data?.session?.user?.email?.toLowerCase().trim() || '';
  }

  async function scopeInfo(scope) {
    const email = await currentEmail();
    if (!email) return { email, emails: [], groupCodes: [], groupScope: null };
    if (scope === 'my_stats') return { email, emails: [email], groupCodes: [], groupScope: null };
    const { data: mine, error: mineError } = await sb.from('group_members').select('group_code').eq('user_email', email);
    if (mineError) throw mineError;
    const mineCodes = [...new Set((mine || []).map(r => r.group_code).filter(Boolean))];
    if (scope === 'all_friends') {
      if (!mineCodes.length) return { email, emails: [email], groupCodes: [], groupScope: null };
      const { data: members, error } = await sb.from('group_members').select('user_email').in('group_code', mineCodes);
      if (error) throw error;
      const emails = [...new Set((members || []).map(r => String(r.user_email || '').toLowerCase().trim()).filter(Boolean))];
      return { email, emails, groupCodes: mineCodes, groupScope: null };
    }
    const groupScope = scope || null;
    const { data: members, error } = await sb.from('group_members').select('user_email').eq('group_code', groupScope);
    if (error) throw error;
    const emails = [...new Set((members || []).map(r => String(r.user_email || '').toLowerCase().trim()).filter(Boolean))];
    return { email, emails, groupCodes: [groupScope].filter(Boolean), groupScope };
  }

  function logicalKey(session) {
    const email = String(session.user_email || '').toLowerCase().trim();
    const place = session.google_place_id || `${session.venue_name || ''}|${Number(session.latitude) || 0}|${Number(session.longitude) || 0}`;
    return `${email}|${place}|${session.started_at || ''}`;
  }

  function logDateKey(value) {
    const text = String(value || '').trim();
    const match = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    return match ? match[1] : text.slice(0, 10);
  }

  function beerTotalFromLog(log) {
    return Object.entries({ pints: log?.pints, bottles: log?.bottles, wines: log?.wines, cocktails: log?.cocktails, shots: log?.shots })
      .reduce((sum, [type, value]) => sum + beerEquivalent(type, value), 0);
  }

  async function legacyFallback(emails, sessions) {
    if (!emails.length || !sessions.length) return {};
    const { data: logs, error } = await sb.from('drink_logs').select('user_email,log_date,pints,bottles,wines,cocktails,shots').in('user_email', emails);
    if (error) throw error;
    const byEmailDate = {};
    sessions.forEach(s => {
      const key = `${String(s.user_email || '').toLowerCase().trim()}|${String(s.started_at || '').slice(0,10)}`;
      (byEmailDate[key] ||= []).push(s);
    });
    const result = {};
    (logs || []).forEach(log => {
      const email = String(log.user_email || '').toLowerCase().trim();
      const matches = byEmailDate[`${email}|${logDateKey(log.log_date)}`] || [];
      if (matches.length !== 1) return;
      const amount = beerTotalFromLog(log);
      if (amount) result[matches[0].logicalId] = amount;
    });
    return result;
  }

  async function getVenueData() {
    const select = $('analytics-group-select');
    const scope = select?.value || 'my_stats';
    const info = await scopeInfo(scope);
    if (!info.emails.length) return { scope, venues: [] };

    let query = sb.from('drinking_sessions')
      .select('id,user_email,group_code,google_place_id,venue_name,venue_address,latitude,longitude,started_at,ended_at')
      .in('user_email', info.emails);
    if (info.groupScope) query = query.eq('group_code', info.groupScope);
    else if (scope === 'all_friends' && info.groupCodes.length) query = query.in('group_code', info.groupCodes);
    const { data: rawSessions, error: sessionError } = await query;
    if (sessionError) throw sessionError;

    // A multi-group check-in creates one physical session per group. Collapse those
    // rows to one logical visit so the same drink cannot count twice in personal/all-friends views.
    const logical = new Map();
    (rawSessions || []).forEach(session => {
      const key = logicalKey(session);
      if (!logical.has(key)) logical.set(key, { ...session, sessionIds: [session.id], logicalId: key });
      else logical.get(key).sessionIds.push(session.id);
    });
    const sessions = [...logical.values()];
    const ids = sessions.flatMap(s => s.sessionIds).filter(Boolean);
    if (!ids.length) return { scope, venues: [] };

    const { data: events, error: eventError } = await sb.from('drink_location_events').select('session_id,drink_type,delta').in('session_id', ids);
    if (eventError) throw eventError;
    const sessionTotals = {};
    (events || []).forEach(event => {
      const session = sessions.find(s => s.sessionIds.includes(event.session_id));
      if (!session) return;
      // Count only one representative session from a multi-group logical visit.
      if (event.session_id !== session.id) return;
      sessionTotals[session.logicalId] = (sessionTotals[session.logicalId] || 0) + beerEquivalent(event.drink_type, event.delta);
    });

    try {
      const fallback = await Promise.race([legacyFallback(info.emails, sessions), new Promise(resolve => setTimeout(() => resolve({}), 4000))]);
      Object.entries(fallback || {}).forEach(([id, amount]) => {
        if (!sessionTotals[id]) sessionTotals[id] = amount;
      });
    } catch (_) {}

    const grouped = {};
    sessions.forEach(session => {
      const drinks = sessionTotals[session.logicalId] || 0;
      if (!drinks) return;
      const name = session.venue_name || 'Unknown venue';
      const key = `${name}|${session.venue_address || ''}|${Number(session.latitude) || 0}|${Number(session.longitude) || 0}`;
      if (!grouped[key]) grouped[key] = { name, address: session.venue_address || '', drinks: 0, latitude: Number(session.latitude), longitude: Number(session.longitude) };
      grouped[key].drinks += drinks;
    });
    return { scope, venues: Object.values(grouped).sort((a,b) => b.drinks - a.drinks || a.name.localeCompare(b.name)) };
  }

  function renderTable(venues) {
    const list = $('top-venues-list');
    if (!list) return;
    if (!venues.length) {
      list.textContent = 'No beers have been recorded at a venue yet.';
      $('show-venues-map-btn')?.classList.add('hidden');
      return;
    }
    list.innerHTML = venues.map((v, i) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color)"><div style="min-width:0"><div style="font-weight:800;font-size:13px">${i+1}. ${esc(v.name)}</div>${v.address ? `<div style="color:var(--text-muted);font-size:10px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(v.address)}</div>` : ''}</div><strong style="color:var(--primary-color);white-space:nowrap">${wholeBeers(v.drinks)} Beers</strong></div>`).join('');
    const points = venues.filter(v => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));
    $('show-venues-map-btn')?.classList.toggle('hidden', !points.length);
    window.__howManyTopVenuePoints = points;
  }

  async function refresh() {
    if (!sb || rendering || !$('analytics-group-select') || !$('top-venues-list')) return;
    rendering = true;
    try {
      const result = await getVenueData();
      const signature = JSON.stringify(result.venues.map(v => [v.name,v.address,Number(v.drinks.toFixed(4)),v.latitude,v.longitude]));
      if (signature !== lastSignature) {
        lastSignature = signature;
        renderTable(result.venues);
        window.__howManyTopVenuePoints = result.venues.filter(v => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));
        if (qualityMap) updateQualityMap(window.__howManyTopVenuePoints);
      }
    } catch (error) {
      console.warn('Top Venues accuracy fix failed:', error.message);
    } finally { rendering = false; }
  }

  function loadMapLibre() {
    if (window.maplibregl) return Promise.resolve();
    if (mapPromise) return mapPromise;
    mapPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css';
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load map library.'));
      document.head.appendChild(script);
    });
    return mapPromise;
  }

  function markerElement() {
    const el = document.createElement('div');
    el.className = 'quality-beer-marker';
    el.setAttribute('aria-label', 'Beer venue');
    el.innerHTML = '<span class="foam"></span><span class="handle"></span>';
    return el;
  }

  function prepareMapPage() {
    const page = $('top-venues-map-page');
    if (!page) return null;
    if ($('top-venues-quality-map')) return page;
    const oldWrap = $('top-venues-map-wrap');
    if (oldWrap) oldWrap.innerHTML = '<div id="top-venues-quality-map"></div>';
    return page;
  }

  async function openQualityMap() {
    const points = window.__howManyTopVenuePoints || [];
    const page = prepareMapPage();
    const container = $('top-venues-quality-map');
    if (!page || !container || !points.length) return;
    addQualityStyles();
    await loadMapLibre();
    if (!qualityMap) {
      qualityMap = new window.maplibregl.Map({
        container,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [points[0].longitude, points[0].latitude],
        zoom: 12,
        attributionControl: true,
        cooperativeGestures: true
      });
      qualityMap.addControl(new window.maplibregl.NavigationControl({showCompass:true}), 'top-right');
      qualityMap.on('load', () => updateQualityMap(points));
    } else {
      updateQualityMap(points);
    }
    requestAnimationFrame(() => qualityMap?.resize());
  }

  function updateQualityMap(points) {
    if (!qualityMap || !points.length) return;
    qualityMarkers.forEach(marker => marker.remove());
    qualityMarkers = points.map(v => {
      const popup = new window.maplibregl.Popup({ offset: 24, closeButton: true, maxWidth: '280px' })
        .setHTML(`<div class="quality-popup"><div class="name">${esc(v.name)}</div><div class="count">${wholeBeers(v.drinks)} Beers logged here</div>${v.address ? `<div class="address">${esc(v.address)}</div>` : ''}</div>`);
      return new window.maplibregl.Marker({element: markerElement(), anchor: 'bottom'})
        .setLngLat([v.longitude, v.latitude])
        .setPopup(popup)
        .addTo(qualityMap);
    });
    const bounds = new window.maplibregl.LngLatBounds();
    points.forEach(v => bounds.extend([v.longitude, v.latitude]));
    if (points.length === 1) qualityMap.jumpTo({center:[points[0].longitude, points[0].latitude], zoom:14});
    else qualityMap.fitBounds(bounds, {padding:70, maxZoom:15});
  }

  function hookMapButton() {
    const button = $('show-venues-map-btn');
    if (!button || button.__qualityHooked) return;
    button.__qualityHooked = true;
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const page = $('top-venues-map-page');
      if (!page) return;
      ['page-tracker','page-stats','page-account','page-admin'].forEach(id => $(id)?.classList.add('hidden'));
      page.classList.remove('hidden');
      openQualityMap().catch(error => console.warn('Quality map failed:', error.message));
      document.querySelector('nav')?.classList.add('hidden');
    }, true);
  }

  function installObserver() {
    if (window.__howManyTopVenueQualityFixInstalled) return;
    window.__howManyTopVenueQualityFixInstalled = true;
    const list = $('top-venues-list');
    const select = $('analytics-group-select');
    if (list && window.MutationObserver) {
      const observer = new MutationObserver(() => {
        if (!rendering) refresh();
      });
      observer.observe(list, { childList: true, subtree: true, characterData: true });
    }
    select?.addEventListener('change', () => { lastSignature = ''; refresh(); });
    hookMapButton();
    refresh();
    const timer = setInterval(() => {
      hookMapButton();
      if ($('analytics-group-select')?.value) refresh();
    }, 1500);
    setTimeout(() => clearInterval(timer), 30000);
  }

  const timer = setInterval(() => {
    if ($('top-venues-list') && $('analytics-group-select')) {
      installObserver();
      clearInterval(timer);
    }
  }, 250);
  setTimeout(() => clearInterval(timer), 15000);
})();
