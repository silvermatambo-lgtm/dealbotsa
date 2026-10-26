const CACHE='dealbotsa-static-v5';
const ASSETS=['/','/manifest.webmanifest','/icon.svg','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const req=e.request;
 if(req.method!=='GET'||new URL(req.url).pathname.startsWith('/api/'))return;
 if(req.mode==='navigate'){
  e.respondWith(fetch(req).then(res=>{if(res.ok&&new URL(req.url).origin===self.location.origin){const copy=res.clone();caches.open(CACHE).then(c=>c.put('/',copy))}return res}).catch(()=>caches.match('/')));return
 }
 if(new URL(req.url).origin!==self.location.origin)return;
 e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const clone=res.clone();caches.open(CACHE).then(c=>c.put(req,clone))}return res})));
});