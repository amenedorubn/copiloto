const C="copiloto18k-v9";
const F=["./icon-192.png","./icon-512.png","./manifest.webmanifest"];
self.addEventListener("install",e=>{self.skipWaiting();
  e.waitUntil(caches.open(C).then(c=>c.addAll(F)).catch(()=>{}));});
self.addEventListener("activate",e=>{e.waitUntil(
  caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))
    .then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET")return;
  const esHTML = r.mode==="navigate" || r.destination==="document" || r.url.endsWith("index.html");
  if(esHTML){                       // siempre red primero: nunca se queda pegado
    e.respondWith(fetch(r,{cache:"no-store"}).then(res=>{
      const cp=res.clone(); caches.open(C).then(c=>c.put("./index.html",cp)); return res;
    }).catch(()=>caches.match("./index.html")));
  }else{                            // iconos y manifest: cache primero
    e.respondWith(caches.match(r).then(x=>x||fetch(r)));
  }});
