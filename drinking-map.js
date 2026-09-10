/* How Many Beers - Drinking Map test feature */
(function () {
  const MAP_SUPABASE_URL = 'https://wxxhppoikbtccsjzaugt.supabase.co';
  const MAP_SUPABASE_KEY = 'sb_publishable_U7nMVicWbqOwWRmLe26udQ_QpMjfdag';
  const mapSb = supabase.createClient(MAP_SUPABASE_URL, MAP_SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'how-many-drinking-map-test-auth' }
  });
  const MAP_FUNCTION_URL = `${MAP_SUPABASE_URL}/functions/v1/find-nearby-venues`;
  let activeSession = null, selectedGroupCode = null, venueCandidates = [];
  const el = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));

  async function currentUser() {
    const session = (typeof sb !== 'undefined' && sb?.auth) ? (await sb.auth.getSession()).data?.session : null;
    return session?.user || null;
  }

  function addStyles() {
    if (el('drinking-map-styles')) return;
    const s = document.createElement('style'); s.id = 'drinking-map-styles';
    s.textContent = '#drinking-map-page .map-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:16px;margin-bottom:16px}#drinking-map-page .venue-candidate{width:100%;text-align:left;background:var(--bg-main);color:var(--text-main);border:1px solid var(--border-color);border-radius:9px;padding:11px;margin-top:8px;cursor:pointer}#drinking-map-page #drinking-map-canvas{width:100%;height:360px;border-radius:10px;overflow:hidden}';
    document.head.appendChild(s);
  }

  function addPage() {
    if (el('drinking-map-page')) return;
    const page = document.createElement('div'); page.id = 'drinking-map-page'; page.className = 'hidden';
    page.innerHTML = '<div class="map-card"><h3 style="margin:0 0 6px;color:var(--primary-color);">📍 Drinking Map</h3><p style="font-size:12px;color:var(--text-muted);">Google Places suggests nearby pubs/bars; you confirm the venue.</p><label>MAP FOR</label><select id="drinking-map-group-select"><option value="">Personal / all logged events</option></select><div id="active-drinking-location"></div><button id="set-drinking-location-btn" class="btn-submit" onclick="setDrinkingLocation()">Set My Drinking Location 📍</button><div id="venue-candidates"></div></div><div class="map-card"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0;font-size:15px;color:var(--text-muted);">POPULAR DRINKING DESTINATIONS</h3><button class="btn-secondary" onclick="refreshDrinkingMap()">Refresh</button></div><div id="drinking-map-canvas" style="margin-top:12px;"></div></div><div class="map-card"><h3 style="margin:0 0 8px;font-size:15px;color:var(--text-muted);">MOST VISITED</h3><div id="drinking-map-ranking"></div></div>';
    el('app-screen')?.appendChild(page);
    const nav = document.querySelector('#app-screen nav');
    if (nav && !el('nav-map')) { const b=document.createElement('button'); b.id='nav-map'; b.textContent='Map'; b.onclick=()=>switchPage('map'); nav.insertBefore(b,el('nav-admin')); }
    el('drinking-map-group-select')?.addEventListener('change', async e => { selectedGroupCode=e.target.value||null; await loadActiveSession(); await refreshDrinkingMap(); });
  }

  async function loadActiveSession() {
    const user=await currentUser(); if(!user)return;
    let q=mapSb.from('drinking_sessions').select('*').eq('user_email',user.email).is('ended_at',null).order('started_at',{ascending:false}).limit(1);
    q=selectedGroupCode?q.eq('group_code',selectedGroupCode):q.is('group_code',null);
    const {data}=await q.maybeSingle(); activeSession=data||null;
    el('active-drinking-location').innerHTML=activeSession?`<div style="margin-top:10px;padding:10px;border:1px solid var(--primary-color);border-radius:8px;font-size:12px"><strong>📍 ${esc(activeSession.venue_name)}</strong><br>${esc(activeSession.venue_address||'')}<button class="btn-secondary" style="float:right" onclick="endDrinkingSession()">Change</button></div>`:'<div style="margin-top:10px;color:var(--text-muted);font-size:12px">No active drinking location.</div>';
  }

  function distance(a,b,c,d){const R=6371000,p=a*Math.PI/180,q=c*Math.PI/180,dp=(c-a)*Math.PI/180,dl=(d-b)*Math.PI/180,h=Math.sin(dp/2)**2+Math.cos(p)*Math.cos(q)*Math.sin(dl/2)**2;return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}

  async function setDrinkingLocation() {
    const button=el('set-drinking-location-btn'), out=el('venue-candidates'); button.disabled=true; out.innerHTML='';
    try {
      const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:10000,maximumAge:60000}));
      const r=await fetch(MAP_FUNCTION_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':MAP_SUPABASE_KEY},body:JSON.stringify({latitude:pos.coords.latitude,longitude:pos.coords.longitude,radius:180})});
      const body=await r.json(); if(!r.ok)throw new Error(body.error||body.message||`Venue search failed (${r.status})`);
      venueCandidates=(body.places||[]).map(p=>({...p,distance:distance(pos.coords.latitude,pos.coords.longitude,p.latitude,p.longitude)}));
      out.innerHTML=venueCandidates.length?'<div style="margin-top:10px;font-size:12px;color:var(--text-muted)">Which venue are you at?</div>'+venueCandidates.slice(0,5).map((p,i)=>`<button class="venue-candidate" onclick="confirmDrinkingVenue(${i})"><strong>${esc(p.name)}</strong><br><small>${Math.round(p.distance)}m away${p.address?' · '+esc(p.address):''}</small></button>`).join(''):'<div style="margin-top:10px;color:var(--text-muted);font-size:12px">No nearby pubs/bars found.</div>';
    } catch(e) { out.innerHTML=`<div style="margin-top:10px;color:#fca5a5;font-size:12px">${esc(e.message||'Could not determine your location.')}</div>`; }
    finally { button.disabled=false; button.textContent='Set My Drinking Location 📍'; }
  }

  async function confirmDrinkingVenue(i) {
    const place=venueCandidates[i], user=await currentUser(); if(!place||!user)return;
    if(activeSession)await endDrinkingSession(true);
    const {data,error}=await mapSb.from('drinking_sessions').insert([{user_email:user.email,group_code:selectedGroupCode||null,google_place_id:place.id,venue_name:place.name,venue_address:place.address||null,latitude:place.latitude,longitude:place.longitude}]).select().single();
    if(error)return alert(error.message);
    activeSession=data; el('venue-candidates').innerHTML='<div style="margin-top:10px;color:var(--text-muted);font-size:12px">Venue confirmed.</div>'; loadActiveSession();
  }

  async function endDrinkingSession(silent=false) {
    if(!activeSession)return;
    const {error}=await mapSb.from('drinking_sessions').update({ended_at:new Date().toISOString()}).eq('id',activeSession.id);
    if(error&&!silent)alert(error.message); activeSession=null; await loadActiveSession();
  }

  async function recordDrinkEvent(type,delta,logDate) {
    if(!activeSession||!delta)return; const user=await currentUser(); if(!user)return;
    const {error}=await mapSb.from('drink_location_events').insert([{session_id:activeSession.id,user_email:user.email,group_code:activeSession.group_code,log_date:logDate,drink_type:type,delta}]);
    if(error)console.error('Drinking map event failed:',error);
  }

  async function refreshDrinkingMap() {
    const user=await currentUser(); if(!user)return;
    let q=mapSb.from('drink_location_events').select('*, drinking_sessions(*)'); q=selectedGroupCode?q.eq('group_code',selectedGroupCode):q.is('group_code',null);
    const {data,error}=await q; if(error){el('drinking-map-ranking').innerHTML=`<div style="color:#fca5a5;font-size:12px">${esc(error.message)}</div>`;return;}
    const totals={}; (data||[]).forEach(e=>{const s=e.drinking_sessions;if(!s)return;const k=s.google_place_id;if(!totals[k])totals[k]={name:s.venue_name,lat:s.latitude,lng:s.longitude,drinks:0,visits:new Set(),users:new Set()};totals[k].drinks+=Number(e.delta||0);totals[k].visits.add(s.id);totals[k].users.add(e.user_email);});
    const venues=Object.values(totals).filter(v=>v.drinks>0).sort((a,b)=>b.drinks-a.drinks);
    el('drinking-map-ranking').innerHTML=venues.length?venues.slice(0,10).map((v,i)=>`<div style="padding:8px 0;border-bottom:1px solid var(--border-color)"><strong>${i+1}. ${esc(v.name)}</strong><br><small>${v.visits.size} visits · ${v.users.size} drinkers · ${v.drinks} drinks</small></div>`).join(''):'<div style="color:var(--text-muted);font-size:12px">No location-linked drinks yet.</div>';
    const canvas=el('drinking-map-canvas'); if(!canvas)return;
    if(!window.L){await new Promise((resolve,reject)=>{const c=document.createElement('link');c.rel='stylesheet';c.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(c);const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
    if(!window.__howManyMap){window.__howManyMap=L.map(canvas).setView([51.5,-0.1],6);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(window.__howManyMap);} 
    if(window.__howManyMapMarkers)(window.__howManyMapMarkers||[]).forEach(m=>m.remove()); window.__howManyMapMarkers=[]; const bounds=[];
    venues.forEach(v=>{const m=L.circleMarker([v.lat,v.lng],{radius:Math.max(8,Math.min(30,8+Math.sqrt(v.drinks)*3)),weight:2,fillOpacity:.75}).bindPopup(`<strong>${esc(v.name)}</strong><br>${v.drinks} drinks`);m.addTo(window.__howManyMap);window.__howManyMapMarkers.push(m);bounds.push([v.lat,v.lng]);});
    if(bounds.length===1)window.__howManyMap.setView(bounds[0],15); else if(bounds.length)window.__howManyMap.fitBounds(bounds,{padding:[20,20],maxZoom:14});
  }

  function installHooks() {
    if(typeof window.adjustDrink==='function'&&!window.__howManyMapDrinkHook){const original=window.adjustDrink;window.adjustDrink=async function(type,delta){const c=el(`cnt-${type}`),before=Number(c?.innerText||0);await original(type,delta);const after=Number(c?.innerText||0);if(after===before+delta)await recordDrinkEvent(type,delta,el('today-date-label')?.innerText||new Date().toISOString().slice(0,10));};window.__howManyMapDrinkHook=true;}
    if(typeof window.switchPage==='function'&&!window.__howManyMapPageHook){const original=window.switchPage;window.switchPage=function(page){if(page==='map'){['page-account','page-tracker','page-stats','page-admin'].forEach(id=>el(id)?.classList.add('hidden'));el('drinking-map-page')?.classList.remove('hidden');populateGroups().then(loadActiveSession).then(refreshDrinkingMap);return;}el('drinking-map-page')?.classList.add('hidden');original(page);};window.__howManyMapPageHook=true;}
  }

  async function populateGroups(){const user=await currentUser();if(!user)return;const {data}=await mapSb.from('group_members').select('group_code,groups(name)').eq('user_email',user.email);const s=el('drinking-map-group-select');if(!s)return;(data||[]).forEach(g=>{if(![...s.options].some(o=>o.value===g.group_code)){const o=document.createElement('option');o.value=g.group_code;o.textContent=g.groups?.name||g.group_code;s.appendChild(o);}});s.value=selectedGroupCode||'';}

  function init(){addStyles();addPage();installHooks();setTimeout(installHooks,500);}
  window.setDrinkingLocation=setDrinkingLocation; window.confirmDrinkingVenue=confirmDrinkingVenue; window.endDrinkingSession=endDrinkingSession; window.refreshDrinkingMap=refreshDrinkingMap;
  init();
})();