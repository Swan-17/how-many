const CACHE_NAME='beer-tracker-v8';
const UI='./group-password-ui-v8.js?v=8';
const urlsToCache=['./','./index.html','./manifest.json',UI];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(urlsToCache)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(async r=>{const t=r.headers.get('content-type')||'';if(!t.includes('text/html'))return r;const html=await r.text();return new Response(html.replace('</body>','<script src="'+UI+'"></script></body>'),{status:r.status,statusText:r.statusText,headers:r.headers})}).catch(()=>caches.match('./index.html').then(r=>r||Response.error())));return}if(new URL(event.request.url).pathname.endsWith('group-password-ui-v8.js')){event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(UI)));return}event.respondWith(caches.match(event.request).then(r=>r||fetch(event.request)))})
