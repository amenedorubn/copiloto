/* Rutas importadas desde un GPX: se leen en el movil y SE QUEDAN en el movil.
   Nada de esto sube a ningun sitio: ni al repo, ni al Worker, ni a localStorage.
   Solo IndexedDB (copiloto-rutas-locales). El inicio de una ruta suele estar
   cerca de casa: por eso no se guarda ningun GPX en el repo, que es publico.

   leeGpx(texto)      -> { ok:true, nombre, pts:[[lat,lon]], ele:[m|null], hora:[ms|null] }
                         { ok:false, error }            (GPX invalido)
   analiza(g)         -> { distancia, asc, desc, tieneEle, tieneHora, kms:[...], perfil:[...], ... }
   perfilSvg(a)       -> SVG del perfil de altitud (o "" si no hay altimetria)
   almacen            -> abre / lista / lee / guarda / borra (IndexedDB)

   Sin dependencias. Pure salvo el almacen, que necesita indexedDB.          */
(function(root){
"use strict";

var MAX_BYTES = 12*1024*1024, MIN_METROS = 100, MAX_PTS = 6000, PASO_MIN = 3;
var UMBRAL_ELE = 1;      // m: cambios de altura menores se tratan como ruido del GPS al sumar desnivel
var PARTE_ELE = 0.9;     // con menos de esta parte de puntos con altura, se dice "sin altimetria" en vez de inventarla

// ---------------------------------------------------------------- lectura
function numero(s){ var v=parseFloat(String(s).trim()); return isFinite(v) ? v : null; }

function leeGpx(texto, ParserCtor){
  if(typeof texto!=="string" || !texto.trim()) return { ok:false, error:"El archivo está vacío." };
  if(texto.length>MAX_BYTES) return { ok:false, error:"El archivo es demasiado grande para ser un GPX de ruta." };
  var Ctor = ParserCtor || root.DOMParser;
  if(!Ctor) return { ok:false, error:"Este navegador no sabe leer GPX." };
  var doc;
  try{ doc=new Ctor().parseFromString(texto,"application/xml"); }
  catch(e){ return { ok:false, error:"No es un GPX válido." }; }
  if(!doc || !doc.documentElement || doc.getElementsByTagName("parsererror").length)
    return { ok:false, error:"No es un GPX válido: el XML está roto." };
  if(doc.documentElement.localName!=="gpx") return { ok:false, error:"No es un GPX: falta la etiqueta gpx." };

  function hijo(n,nom){ for(var c=n.firstElementChild;c;c=c.nextElementSibling) if(c.localName===nom) return c; return null; }
  function todos(n,nom){ return Array.prototype.slice.call(n.getElementsByTagNameNS("*",nom)); }
  // un track (el primero); si no hay, la ruta (rte)
  var trk=todos(doc,"trk")[0], fuente=null;
  if(trk){ fuente=todos(trk,"trkpt"); }
  if(!fuente || !fuente.length){ var rte=todos(doc,"rte")[0]; if(rte) fuente=todos(rte,"rtept"); }
  if(!fuente || !fuente.length) return { ok:false, error:"El GPX no trae ningún trazado (ni track ni ruta)." };

  var nombre="", ne=trk ? hijo(trk,"name") : null;
  if(ne && ne.textContent.trim()) nombre=ne.textContent.trim().slice(0,80);
  if(!nombre){ var me=doc.getElementsByTagNameNS("*","metadata")[0], mn=me?hijo(me,"name"):null; if(mn) nombre=mn.textContent.trim().slice(0,80); }

  var pts=[], ele=[], hora=[], malos=0;
  fuente.forEach(function(p){
    var la=numero(p.getAttribute("lat")), lo=numero(p.getAttribute("lon"));
    if(la===null||lo===null||la<-90||la>90||lo<-180||lo>180){ malos++; return; }
    var e=hijo(p,"ele"), t=hijo(p,"time");
    var h=e?numero(e.textContent):null, ms=t?Date.parse(t.textContent.trim()):NaN;
    pts.push([la,lo]); ele.push(h); hora.push(isFinite(ms)?ms:null);
  });
  if(pts.length<2) return { ok:false, error:"El GPX no tiene dos puntos válidos para trazar una ruta." };
  return { ok:true, nombre:nombre, pts:pts, ele:ele, hora:hora, descartados:malos };
}

// ---------------------------------------------------------------- calculo
function haversine(a,b){
  var R=6371008.8, r=Math.PI/180, dp=(b[0]-a[0])*r, dl=(b[1]-a[1])*r;
  var x=Math.sin(dp/2)*Math.sin(dp/2)+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dl/2)*Math.sin(dl/2);
  return 2*R*Math.asin(Math.min(1,Math.sqrt(x)));
}
function acumulada(pts){
  var A=[0]; for(var i=1;i<pts.length;i++) A.push(A[i-1]+haversine(pts[i-1],pts[i]));
  return A;
}
// altura en el metro d (interpolada); ignora puntos sin altura
function alturaEn(A,E,d){
  var i=0, n=A.length, a=-1, b=-1, j;
  for(j=0;j<n;j++){ if(E[j]===null) continue; if(A[j]<=d) a=j; if(A[j]>=d){ b=j; break; } }
  if(a<0 && b<0) return null;
  if(a<0) return E[b]; if(b<0) return E[a];
  if(a===b || A[b]===A[a]) return E[a];
  return E[a]+(E[b]-E[a])*(d-A[a])/(A[b]-A[a]);
}
// desnivel con histeresis: solo cuenta un cambio cuando pasa de UMBRAL_ELE
function desnivel(E){
  var asc=0, desc=0, ref=null;
  for(var i=0;i<E.length;i++){
    if(E[i]===null) continue;
    if(ref===null){ ref=E[i]; continue; }
    var d=E[i]-ref;
    if(d>=UMBRAL_ELE){ asc+=d; ref=E[i]; }
    else if(d<=-UMBRAL_ELE){ desc-=d; ref=E[i]; }
  }
  return { asc:Math.round(asc), desc:Math.round(desc) };
}

function analiza(g){
  if(!g || !g.ok) return null;
  var A=acumulada(g.pts), dist=A[A.length-1];
  var conEle=g.ele.filter(function(h){ return h!==null; }).length;
  var conHora=g.hora.filter(function(h){ return h!==null; }).length;
  var tieneEle = conEle>=2 && conEle/g.ele.length>=PARTE_ELE;
  var tieneHora = conHora>=2 && conHora/g.hora.length>=PARTE_ELE;
  var res={ distancia:Math.round(dist), puntos:g.pts.length, tieneEle:tieneEle, tieneHora:tieneHora,
            eleParcial: tieneEle && conEle<g.ele.length,
            asc:null, desc:null, eleMin:null, eleMax:null, kms:[], perfil:[] };
  if(!tieneEle) return res;
  var E=g.ele, d=desnivel(E);
  res.asc=d.asc; res.desc=d.desc;
  var vistas=E.filter(function(h){ return h!==null; });
  res.eleMin=Math.round(Math.min.apply(null,vistas)); res.eleMax=Math.round(Math.max.apply(null,vistas));
  // perfil cada 100 m (la altura que usa el motor para las cuestas)
  for(var m=0;m<=dist;m+=100){ var h=alturaEn(A,E,m); res.perfil.push([m, h===null?null:Math.round(h*10)/10]); }
  var ult=res.perfil[res.perfil.length-1]; if(ult[0]<dist){ var hf=alturaEn(A,E,dist); res.perfil.push([Math.round(dist), hf===null?null:Math.round(hf*10)/10]); }
  // por km (el ultimo, parcial): altura al empezar, al acabar y lo que sube y baja dentro
  for(var k=0; k*1000<dist; k++){
    var d0=k*1000, d1=Math.min(dist,(k+1)*1000), sub=[];
    for(var q=0;q<res.perfil.length;q++) if(res.perfil[q][0]>=d0 && res.perfil[q][0]<=d1) sub.push(res.perfil[q][1]);
    var e0=alturaEn(A,E,d0), e1=alturaEn(A,E,d1), dd=desnivel(sub.concat([e1]).filter(function(h){ return h!==null; }));
    res.kms.push({ km:k+1, largo:Math.round(d1-d0), ini:Math.round(e0), fin:Math.round(e1),
                   asc:dd.asc, desc:dd.desc });
  }
  return res;
}

// quita puntos casi iguales y, si hay demasiados, deja los justos (conserva primero y ultimo)
function aligera(g){
  var A=acumulada(g.pts), pts=[], ele=[], hora=[], ult=-1e9;
  for(var i=0;i<g.pts.length;i++){
    if(i===0 || i===g.pts.length-1 || A[i]-ult>=PASO_MIN){ pts.push(g.pts[i]); ele.push(g.ele[i]); hora.push(g.hora[i]); ult=A[i]; }
  }
  if(pts.length>MAX_PTS){
    var paso=(pts.length-1)/(MAX_PTS-1), p2=[], e2=[], h2=[];
    for(var k=0;k<MAX_PTS;k++){ var j=Math.round(k*paso); p2.push(pts[j]); e2.push(ele[j]); h2.push(hora[j]); }
    pts=p2; ele=e2; hora=h2;
  }
  return { ok:true, nombre:g.nombre, pts:pts, ele:ele, hora:hora, descartados:g.descartados };
}

// polilinea codificada (la misma que usa la app para las rutas)
function codifica(pts){
  var out="", pl=0, po=0;
  function n(v){ v = v<0 ? ~(v<<1) : (v<<1); var r="";
    while(v>=0x20){ r+=String.fromCharCode((0x20|(v&0x1f))+63); v>>=5; }
    return r+String.fromCharCode(v+63); }
  pts.forEach(function(p){ var a=Math.round(p[0]*1e5), b=Math.round(p[1]*1e5); out+=n(a-pl)+n(b-po); pl=a; po=b; });
  return out;
}

function reduce(pts,n){
  if(pts.length<=n) return pts;
  var paso=(pts.length-1)/(n-1), out=[];
  for(var k=0;k<n;k++) out.push(pts[Math.round(k*paso)]);
  return out;
}
// ficha para guardar y mostrar: nunca lleva el texto del GPX (mini = trazado reducido para el minimapa y la distancia a la salida)
function ficha(g, a, nombreArchivo){
  var nombre=g.nombre || String(nombreArchivo||"Ruta importada").replace(/\.gpx$/i,"").trim() || "Ruta importada";
  var h=2166136261, s=nombre+"|"+a.distancia+"|"+g.pts[0].join(",")+"|"+g.pts[g.pts.length-1].join(",");
  for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; }
  return { id:"loc-"+h.toString(36), origen:"local", nombre:nombre, creada:Date.now(), mini:codifica(reduce(g.pts,300)),
           distancia:a.distancia, desnivel:a.asc===null?0:a.asc, asc:a.asc, desc:a.desc,
           tieneEle:a.tieneEle, tieneHora:a.tieneHora, eleParcial:a.eleParcial,
           eleMin:a.eleMin, eleMax:a.eleMax, kms:a.kms, perfil:a.perfil, veces:0, ultima:null, rectas:null };
}

// ---------------------------------------------------------------- dibujo
function coma(n,dec){ return (Math.round(n*Math.pow(10,dec))/Math.pow(10,dec)).toFixed(dec).replace(".",","); }
function perfilSvg(a, o){
  if(!a || !a.tieneEle || !a.perfil || a.perfil.length<2) return "";
  o=o||{};
  var W=300, H=o.alto||72, pad=4, P=a.perfil.filter(function(p){ return p[1]!==null; });
  var lo=a.eleMin, hi=a.eleMax, rango=Math.max(10,hi-lo), dist=P[P.length-1][0], d="", area="";
  P.forEach(function(p,i){
    var x=pad+(p[0]/dist)*(W-2*pad), y=H-pad-((p[1]-lo)/rango)*(H-2*pad);
    d+=(i?"L":"M")+x.toFixed(1)+" "+y.toFixed(1);
  });
  var x0=pad, x1=W-pad;
  area=d+"L"+x1.toFixed(1)+" "+(H-pad)+"L"+x0.toFixed(1)+" "+(H-pad)+"Z";
  var marcas="";
  for(var k=1;k*1000<dist;k++){ var x=pad+(k*1000/dist)*(W-2*pad);
    marcas+='<line x1="'+x.toFixed(1)+'" y1="'+(H-pad)+'" x2="'+x.toFixed(1)+'" y2="'+(H-pad-5)+'" stroke="currentColor" stroke-opacity=".5"/>'; }
  return '<svg class="rlPerfil" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Perfil de altitud, de '+Math.round(lo)+' a '+Math.round(hi)+' metros">'+
    '<path d="'+area+'" fill="currentColor" fill-opacity=".14"/>'+
    '<path d="'+d+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'+marcas+'</svg>';
}
function resumenTxt(f){
  var km=coma(f.distancia/1000,2)+" km";
  if(!f.tieneEle) return km+" · sin altimetría en el GPX";
  return km+" · +"+f.asc+" m / −"+f.desc+" m";
}

// ---------------------------------------------------------------- almacen (IndexedDB)
var DB="copiloto-rutas-locales", ST="rutas", abierta=null;
function abre(){
  if(abierta) return abierta;
  abierta=new Promise(function(ok,mal){
    var idb=root.indexedDB;
    if(!idb){ mal(new Error("Este navegador no guarda datos de la app (IndexedDB).")); return; }
    var rq;
    try{ rq=idb.open(DB,1); }catch(e){ mal(e); return; }
    rq.onupgradeneeded=function(){ rq.result.createObjectStore(ST,{ keyPath:"id" }); };
    rq.onsuccess=function(){ ok(rq.result); };
    rq.onerror=function(){ mal(rq.error||new Error("No se pudo abrir el almacén.")); };
    rq.onblocked=function(){ mal(new Error("El almacén está bloqueado por otra pestaña.")); };
  });
  abierta.catch(function(){ abierta=null; });   // si falla, el siguiente intento vuelve a probar
  return abierta;
}
function tx(modo, fn){
  return abre().then(function(db){
    return new Promise(function(ok,mal){
      var t=db.transaction(ST,modo), r=fn(t.objectStore(ST));
      t.oncomplete=function(){ ok(r && r.result!==undefined ? r.result : undefined); };
      t.onerror=function(){ mal(t.error||new Error("Error al guardar.")); };
      t.onabort=function(){ mal(t.error||new Error("Se canceló el guardado (¿sin espacio?).")); };
    });
  });
}
var almacen={
  abre:abre,
  // fichas (sin los puntos) para la lista
  lista:function(){ return tx("readonly",function(s){ return s.getAll(); })
    .then(function(l){ return (l||[]).map(function(r){ var f={}; Object.keys(r).forEach(function(k){ if(k!=="linea"&&k!=="eleRuta") f[k]=r[k]; }); return f; })
                       .sort(function(a,b){ return (b.creada||0)-(a.creada||0); }); }); },
  // la ruta entera: { linea, ele } como la espera el motor
  lee:function(id){ return tx("readonly",function(s){ return s.get(id); })
    .then(function(r){ return r && r.linea ? { linea:r.linea, ele:r.eleRuta||[] } : null; }); },
  guarda:function(fichaRuta, linea, eleRuta){
    var r={}; Object.keys(fichaRuta).forEach(function(k){ r[k]=fichaRuta[k]; }); r.linea=linea; r.eleRuta=eleRuta||[];
    return tx("readwrite",function(s){ return s.put(r); }); },
  borra:function(id){ return tx("readwrite",function(s){ return s.delete(id); }); }
};

root.RutaLocal={ leeGpx:leeGpx, analiza:analiza, aligera:aligera, codifica:codifica, ficha:ficha,
                 perfilSvg:perfilSvg, resumenTxt:resumenTxt, haversine:haversine, acumulada:acumulada,
                 desnivel:desnivel, almacen:almacen, MIN_METROS:MIN_METROS };
if(typeof module!=="undefined" && module.exports) module.exports=root.RutaLocal;
})(typeof window!=="undefined" ? window : globalThis);
