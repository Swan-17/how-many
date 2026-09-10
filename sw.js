const CACHE_NAME='beer-tracker-v23';
const UI='./group-password-ui-v10.js?v=10';
const urlsToCache=['./','./index.html','./manifest.json',UI];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(urlsToCache)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.mode==='navigate'){event.respondWith(fetch(event.request,{cache:'no-store'}).then(async r=>{const t=r.headers.get('content-type')||'';if(!t.includes('text/html'))return r;const html=await r.text();const fixes=`<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"><style>
html,body,button,input,select,textarea{touch-action:manipulation;}
input,select,textarea{font-size:16px !important;}
</style><script>
(function(){
  window.deleteGroup=async function(code){
    if(!confirm('Delete group "'+code+'" for everyone?'))return;
    try{
      const {error}=await sb.rpc('delete_group_secure',{p_group_code:code});
      if(error)throw error;
      closeHostPanel();
      await fetchUserGroups();
    }catch(err){
      console.error('Delete group failed:',err);
      alert(err?.message||'Could not delete the group.');
    }
  };
})();
</script>`;return new Response(html.replace('</head>',fixes+'</head>').replace('</body>','<script src="'+UI+'"></script></body>'),{status:r.status,statusText:r.statusText,headers:r.headers})}).catch(()=>caches.match('./index.html').then(r=>r||Response.error())));return}if(u.pathname.endsWith('group-password-ui-v10.js')){event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(UI)));return}event.respondWith(caches.match(event.request).then(r=>r||fetch(event.request)))})
