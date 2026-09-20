const C="copiloto18k-v7";
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>{e.waitUntil(caches.keys()
  .then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET")return;
  const html = r.mode==="navigate"||r.destination==="document"||r.url.endsWith("index.html");
  if(html){ e.respondWith(fetch(r,{cache:"no-store"}).then(res=>{
      const cp=res.clone(); caches.open(C).then(c=>c.put("./index.html",cp)); return res;
    }).catch(()=>caches.match("./index.html"))); }
  else { e.respondWith(caches.match(r).then(x=>x||fetch(r).then(res=>{
      const cp=res.clone(); caches.open(C).then(c=>c.put(r,cp)); return res;}))); }});
