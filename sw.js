const C="copiloto-2.1.1";
const F=["./manifest.webmanifest","./manifest-n1.webmanifest","./manifest-b1.webmanifest","./manifest-r1.webmanifest",
         "./iconos/n1/icon.svg","./iconos/n1/icon-192.png","./iconos/n1/icon-512.png","./iconos/n1/icon-maskable-192.png","./iconos/n1/icon-maskable-512.png","./iconos/n1/apple-touch-icon.png",
         "./iconos/b1/icon.svg","./iconos/b1/icon-192.png","./iconos/b1/icon-512.png","./iconos/b1/icon-maskable-192.png","./iconos/b1/icon-maskable-512.png","./iconos/b1/apple-touch-icon.png",
         "./iconos/r1/icon.svg","./iconos/r1/icon-192.png","./iconos/r1/icon-512.png","./iconos/r1/icon-maskable-192.png","./iconos/r1/icon-maskable-512.png","./iconos/r1/apple-touch-icon.png",
         "./rutas/20K_ZAPATOCA.gpx","./rutas/6K_ZAPATOCA.gpx","./rutas/6K1_ZAPATOCA_RECTAS.gpx","./fonts/Manrope.woff2"];
// Las caches son de todo el dominio: v20/ tiene la suya ("copiloto-v20-…") y no
// se toca. Aqui solo se borran las versiones viejas de la raiz: las X.Y.Z y la
// "copiloto-v12" de antes del versionado.
const MIA=/^copiloto-(\d+\.\d+\.\d+|v12)$/;
// La version nueva se instala y ESPERA: solo toma el mando cuando la app se
// cierra del todo o cuando la pagina lo pide con "Actualizar ahora".
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(F)).catch(()=>{}));});
self.addEventListener("message",e=>{
  if(e.data && e.data.type==="SKIP_WAITING") self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(
  caches.keys().then(k=>Promise.all(k.filter(x=>x!==C && MIA.test(x)).map(x=>caches.delete(x))))
    .then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET")return;
  const u=new URL(r.url);
  if(u.origin===location.origin && u.pathname.endsWith("/version.json")) return;  // siempre de la red
  const esHTML = r.mode==="navigate" || r.destination==="document" || r.url.endsWith("index.html");
  if(esHTML){                       // siempre red primero: nunca se queda pegado
    e.respondWith(fetch(r,{cache:"no-store"}).then(res=>{
      const cp=res.clone(); caches.open(C).then(c=>c.put("./index.html",cp)); return res;
    }).catch(()=>caches.match("./index.html")));
  }else{                            // iconos, manifest y rutas de la app: cache primero
    e.respondWith(caches.match(r).then(x=>x||fetch(r)));
  }});
