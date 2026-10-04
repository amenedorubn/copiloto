/* ===========================================================================
   ARC (v3) · Winter Arc
   ---------------------------------------------------------------------------
   Del 1/9/2026 al 31/12/2026: 122 dias. El Arc empezo el 1 de septiembre,
   el dia en que empezo el cambio de verdad; no hay "prologo".

   El metodo:
   - Un objetivo (texto libre, vacio hasta que lo escribas).
   - De 3 a 5 reglas de si/no; se pueden cambiar hasta el 30/09. Vienen tres:
     "Cumplir el plan de Entreno" (automatica: calendario + Strava/Hevy),
     "Dormir 7 h o mas" (sale de Huawei Health si hay datos; si no, un toque)
     y "20 min de estudio o lectura" (un toque).
   - Los dias cumplidos solo suman y la fuerza (como Loop Habit Tracker) sube
     con cada dia cumplido y baja poco con un fallo. Aviso con 2 fallos
     seguidos. Revision el domingo. Etapas: el Arc en capitulos.
   - Lo que no se sabe no es un fallo: un dia sin datos (antes de que la app
     apuntara una regla manual, o sin copia del calendario) sale "sin datos"
     y no suma ni resta. Y lo automatico se puede marcar "hecho sin
     registrar" (p. ej. una caminata que no se grabo).

   Semanas de lunes a domingo; la primera (martes 1 a domingo 6) va sola.
   18 semanas: la ultima, del 28 al 31/12. Datos en localStorage
   "copiloto.arc.*" con version. Sin DOM en esta parte: node lo carga para los
   tests. No toca el GPS, la cinta ni la voz.
   =========================================================================== */
(function(raiz, fabrica){
  var A=fabrica();
  if(typeof module==="object" && module.exports) module.exports=A; else raiz.Arc=A;
})(this, function(){
"use strict";

var VERSION_DATOS=3;
var K_DATOS="copiloto.arc.datos", K_DISENO="copiloto.arc.diseno", K_SALUD="copiloto.arc.salud";
var INICIO="2026-09-01", FIN="2026-12-31", EDITA_HASTA="2026-09-30";
var MIN_REGLAS=3, MAX_REGLAS=5, MAX_NOMBRE=40, MAX_OBJETIVO=140, MAX_ETAPAS=6, MAX_ETAPA=22, MAX_SUB=60;
var SUENO_MIN=420, PASOS_CAMINATA=8000;
var FUENTES={ plan:"Plan de Entreno", correr:"Correr (Strava)", gym:"Gimnasio (Hevy)", entreno:"Cualquier entreno" };
var DISENOS={ A:"Anillos", B:"Línea del día", C:"Temporada", D:"Cuadrícula" }, DISENO_DEF="A";
var MESES=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
var MESES_L=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
var DIAS_L=["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];
// un evento del calendario que es andar: vale con una caminata grabada o con los pasos de Huawei
var RE_CAMINA=/(^|[^a-zñ])(camin\w*|paseo|pasear|andar|walk\w*|senderis\w*|hik\w*)/i;

/* ------------------------------- fechas -------------------------------
   Siempre "AAAA-MM-DD" y cuentas en UTC: el cambio de hora no mueve dias. */
function dos(n){ return n<10 ? "0"+n : ""+n; }
function aNum(iso){ var p=iso.split("-"); return Date.UTC(+p[0],+p[1]-1,+p[2])/864e5; }
function deNum(n){ var d=new Date(n*864e5); return d.getUTCFullYear()+"-"+dos(d.getUTCMonth()+1)+"-"+dos(d.getUTCDate()); }
function mas(iso,n){ return deNum(aNum(iso)+n); }
function entre(a,b){ return aNum(b)-aNum(a); }
function diaSem(iso){ return (new Date(aNum(iso)*864e5).getUTCDay()+6)%7; }   // 0 = lunes
function corta(iso){ var p=iso.split("-"); return (+p[2])+" "+MESES[+p[1]-1]; }
function larga(iso){ var p=iso.split("-"); return DIAS_L[diaSem(iso)]+" "+(+p[2])+" de "+MESES_L[+p[1]-1]; }
function mayus(t){ return t.charAt(0).toUpperCase()+t.slice(1); }
function esFecha(x){ return typeof x==="string" && /^\d{4}-\d\d-\d\d$/.test(x) && deNum(aNum(x))===x; }
function esHora(h){ return typeof h==="string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(h); }
function esObj(x){ return !!x && typeof x==="object" && !Array.isArray(x); }

var TOTAL=entre(INICIO,FIN)+1;                     // 122
var SEMANAS=(function(){
  var S=[], d=INICIO, f;
  while(d<=FIN){ f=mas(d,6-diaSem(d)); if(f>FIN) f=FIN; S.push({ desde:d, hasta:f }); d=mas(f,1); }
  // una primera semana de menos de 4 dias iria sola sin sentido: se junta con la siguiente
  if(S.length>1 && entre(S[0].desde,S[0].hasta)<3){ S[1].desde=S[0].desde; S.shift(); }
  S.forEach(function(s,i){ s.n=i+1; s.dias=entre(s.desde,s.hasta)+1; });
  return S;
})();
function enArc(iso){ return !!iso && iso>=INICIO && iso<=FIN; }
function diaArc(iso){ return enArc(iso) ? entre(INICIO,iso)+1 : null; }
function semanaDe(iso){
  if(!enArc(iso)) return null;
  for(var i=0;i<SEMANAS.length;i++) if(iso>=SEMANAS[i].desde && iso<=SEMANAS[i].hasta) return SEMANAS[i];
  return null;
}
function semanaArc(iso){ var s=semanaDe(iso); return s ? s.n : null; }
function editable(hoy){ return hoy<=EDITA_HASTA; }

/* ------------------------------- reglas ------------------------------- */
// "alta": desde cuando la app apunta una regla manual. Antes de eso, sin un
// toque ni datos, el dia es "sin datos" (no se sabe), no un fallo.
function preset(hoy){
  var alta = "2026-09-28";                                // la app apunta las manuales desde el Foro
  return [
    { id:"plan", nombre:"Cumplir el plan de Entreno", tipo:"auto", fuente:"plan", ancla:"20:00" },
    { id:"dormir", nombre:"Dormir 7 h o más", tipo:"manual", dato:"sueno", ayuda:"Se marca al levantarse y cuenta para ese día", ancla:"08:00", alta:alta },
    { id:"estudio", nombre:"20 min de estudio o lectura", tipo:"manual", ancla:"21:00", alta:alta }
  ];
}
function reglaValida(r){
  return esObj(r) && typeof r.id==="string" && typeof r.nombre==="string" && r.nombre.trim() &&
    (r.tipo==="manual" || (r.tipo==="auto" && FUENTES[r.fuente]));
}
function limpiaGuardada(r,hoy){
  var o={ id:r.id, nombre:r.nombre.trim().slice(0,MAX_NOMBRE), tipo:r.tipo };
  if(r.tipo==="auto") o.fuente=r.fuente;
  if(r.tipo==="manual"){
    o.alta = esFecha(r.alta) ? r.alta : (hoy && enArc(hoy) ? hoy : INICIO);
    if(r.dato==="sueno") o.dato="sueno";
  }
  if(typeof r.ayuda==="string" && r.ayuda.trim()) o.ayuda=r.ayuda.trim().slice(0,80);
  o.ancla = esHora(r.ancla) ? r.ancla : (r.tipo==="auto" ? "20:00" : "21:00");
  return o;
}

/* ------------------------------- etapas -------------------------------
   El Arc en capitulos. Las de partida salen de los planes reales (28/09):
   ver presetEtapas(). Nombre y fechas se cambian cuando se quiera: ordenan,
   no cambian lo que cuenta.                                             */
// "Hoja de ruta" en bloques de 4 semanas (29/09): de la Calzada (subir hasta el 20K) al Faro (la Torre de
// Hercules, Navidad en A Coruña). Salen del calendario y los vuelos reales
// (28/09). El icono, el destino del miliario y la consigna van por id.
function presetEtapas(){
  return [
    { id:"e1", nombre:"Calzada", sub:"Subir la intensidad hasta el test de 20 km", desde:"2026-09-01", hasta:"2026-09-27", icono:"path" },
    { id:"e2", nombre:"Foro", sub:"Cuatro semanas para Roma: afinar, correr y recuperar", desde:"2026-09-28", hasta:"2026-10-25", icono:"flag-checkered" },
    { id:"e3", nombre:"Travesía", sub:"México y Europa: nunca falles dos veces", desde:"2026-10-26", hasta:"2026-11-29", icono:"globe-hemisphere-west" },
    { id:"e4", nombre:"Vuelta", sub:"De vuelta en casa: recuperar el ritmo antes de Navidad", desde:"2026-11-30", hasta:"2026-12-20", icono:"house-line" },
    { id:"e5", nombre:"Faro", sub:"Navidad en A Coruña: cerrar el año", desde:"2026-12-21", hasta:"2026-12-31", icono:"torre-hercules" }
  ];
}
// los viajes (la app no lee vuelos: van aqui, editables). Solo nombres de ciudad.
function presetViajes(){
  return [
    { id:"v1", fecha:"2026-10-10", de:"Madrid", a:"A Coruña" },
    { id:"v2", fecha:"2026-10-14", de:"A Coruña", a:"Madrid" },
    { id:"v3", fecha:"2026-10-17", de:"Madrid", a:"Roma" },
    { id:"v4", fecha:"2026-10-19", de:"Roma", a:"Madrid" },
    { id:"v5", fecha:"2026-11-03", de:"Madrid", a:"Ciudad de México" },
    { id:"v6", fecha:"2026-11-12", de:"Ciudad de México", a:"Cancún" },
    { id:"v7", fecha:"2026-11-17", de:"Cancún", a:"Madrid", via:"Ciudad de México", llega:"2026-11-18" },
    { id:"v8", fecha:"2026-11-19", de:"Madrid", a:"A Coruña", posible:true },          // en tren: jueves 19 o viernes 20
    { id:"v9", fecha:"2026-11-23", de:"A Coruña", a:"Madrid" },                        // 21:10 → 22:20; duerme en casa y cambia de maletas; el 24 a las 7:00 sale el de Ámsterdam
    { id:"v11", fecha:"2026-11-24", de:"Madrid", a:"Ámsterdam" },
    { id:"v15", fecha:"2026-11-25", de:"Ámsterdam", a:"Bruselas" },                    // tren por la tarde, de los últimos
    { id:"v12", fecha:"2026-11-26", de:"Bruselas", a:"París" },                        // Eurostar de ida y vuelta el mismo día
    { id:"v13", fecha:"2026-11-26", de:"París", a:"Bruselas" },
    { id:"v14", fecha:"2026-11-30", de:"Bruselas", a:"Madrid" },
    { id:"v10", fecha:"2026-12-19", de:"Madrid", a:"A Coruña" }
  ];
}
// la carrera es un hito aparte (la distancia solo sale de Strava, nunca a mano)
var CARRERA={ fecha:"2026-10-18", texto:"Carrera de Roma", ciudad:"Roma" };
function etapaValida(e){
  return esObj(e) && typeof e.id==="string" && typeof e.nombre==="string" && e.nombre.trim() &&
    esFecha(e.desde) && esFecha(e.hasta) && e.desde<=e.hasta && e.desde>=INICIO && e.hasta<=FIN;
}
function limpiaEtapaGuardada(e){
  var o={ id:e.id, nombre:e.nombre.trim().slice(0,MAX_NOMBRE).trim(), desde:e.desde, hasta:e.hasta };
  if(typeof e.sub==="string" && e.sub.trim()) o.sub=e.sub.trim().slice(0,MAX_SUB);
  if(typeof e.hito==="string" && e.hito.trim()) o.hito=e.hito.trim().slice(0,40);
  if(typeof e.icono==="string" && /^[a-z-]{2,40}$/.test(e.icono)) o.icono=e.icono;
  return o;
}
function ordenEtapas(L){ return L.slice().sort(function(a,b){ return a.desde<b.desde ? -1 : a.desde>b.desde ? 1 : 0; }); }
function etapaDe(D,iso){
  var L=ordenEtapas(D.etapas||[]);
  for(var i=0;i<L.length;i++) if(iso>=L[i].desde && iso<=L[i].hasta) return { etapa:L[i], n:i+1, total:L.length };
  return null;
}

/* ------------------------------- datos -------------------------------- */
function vacio(hoy){ return { v:VERSION_DATOS, objetivo:"", reglas:preset(hoy), etapas:presetEtapas(), viajes:presetViajes(), checks:{}, auto:{}, plan:{}, notas:{} }; }
function normaliza(x,hoy){
  var D=vacio(hoy);
  D.reglas = Array.isArray(x.reglas) ? x.reglas.filter(reglaValida).slice(0,MAX_REGLAS).map(function(r){ return limpiaGuardada(r,hoy); }) : [];
  D.objetivo = typeof x.objetivo==="string" ? x.objetivo.slice(0,MAX_OBJETIVO) : "";
  var et = Array.isArray(x.etapas) ? x.etapas.filter(etapaValida).slice(0,MAX_ETAPAS) : [];
  if(et.length) D.etapas=ordenEtapas(et.map(limpiaEtapaGuardada));
  if(Array.isArray(x.viajes)) D.viajes=x.viajes.filter(viajeValido).slice(0,30).map(limpiaViajeGuardado);
  ["checks","auto","plan","notas"].forEach(function(k){ if(esObj(x[k])) D[k]=x[k]; });
  if(Array.isArray(x.reglasPrevias)) D.reglasPrevias=x.reglasPrevias.filter(reglaValida).map(function(r){ return limpiaGuardada(r,hoy); });
  return D;
}
function mismasReglas(a,b){
  return a.length===b.length && a.every(function(r,i){ return r.nombre===b[i].nombre && r.tipo===b[i].tipo && r.fuente===b[i].fuente; });
}
// las etapas de la 2.8 (las mismas cuatro sin tocar) pasan a las de ahora
var ETAPAS_28=["Hacia Roma","De Roma a México","México y noviembre de viajes","Diciembre"];
/* v0/v1/v2 -> v3.
   - Hasta el 30/09 y sin ningun check: las reglas pasan a las precargadas
     (las que hubiera quedan en "reglasPrevias").
   - Cada regla manual recibe su "alta" (hoy): antes, sin datos, no se sabe.
   - "Dormir" pasa a leer el sueño de Huawei.
   - Las etapas de la 2.8 sin tocar pasan a las nuevas.
   Una version mas nueva que esta app no se toca: solo se lee.           */
function migra(x,hoy){
  if(!esObj(x)) return { D:vacio(hoy), error:"roto", soloLectura:true };
  if(typeof x.v==="number" && x.v>VERSION_DATOS) return { D:normaliza(x,hoy), error:"nueva", soloLectura:true };
  if(x.v!=null && x.v!==0 && x.v!==1 && x.v!==2 && x.v!==VERSION_DATOS) return { D:vacio(hoy), error:"roto", soloLectura:true };
  var D=normaliza(x,hoy), antes = x.v!==VERSION_DATOS;
  if(antes){
    if((x.v==null || x.v===0 || x.v===1) && hoy && editable(hoy) && !Object.keys(D.checks).length && !mismasReglas(D.reglas,preset(hoy))){
      if(D.reglas.length && !D.reglasPrevias) D.reglasPrevias=D.reglas;
      D.reglas=preset(hoy);
    }
    D.reglas.forEach(function(r){ if(r.id==="dormir" && r.tipo==="manual" && r.nombre==="Dormir 7 h o más") r.dato="sueno"; });
    if(Array.isArray(x.etapas) && x.etapas.length===ETAPAS_28.length &&
       x.etapas.every(function(e,i){ var p=[["2026-09-01","2026-10-18"],["2026-10-19","2026-11-02"],["2026-11-03","2026-11-30"],["2026-12-01","2026-12-31"]][i]; return e && e.nombre===ETAPAS_28[i] && e.desde===p[0] && e.hasta===p[1]; })) D.etapas=presetEtapas();
  }
  D.reglas=preset(hoy); D.etapas=presetEtapas(); D.viajes=presetViajes();
  var p29=[["Calzada","2026-09-01","2026-10-18"],["Tierra firme","2026-10-19","2026-11-02"],["Travesía","2026-11-03","2026-11-30"],["Faro","2026-12-01","2026-12-31"]];
  if(D.etapas.length===4 && D.etapas.every(function(e,i){ return e.nombre===p29[i][0] && e.desde===p29[i][1] && e.hasta===p29[i][2]; })){ D.etapas=presetEtapas(); antes=true; }
  return antes ? { D:D, migrado:true } : { D:D };
}
function carga(almacen,hoy){
  var raw;
  try{ raw=almacen.getItem(K_DATOS); }catch(e){ return { D:vacio(hoy), error:"almacen", soloLectura:true }; }
  if(raw==null) return { D:vacio(hoy) };
  try{ return migra(JSON.parse(raw),hoy); }catch(e){ return { D:vacio(hoy), error:"roto", soloLectura:true }; }
}
function guardaEn(almacen,D){ try{ almacen.setItem(K_DATOS,JSON.stringify(D)); return true; }catch(e){ return false; } }

/* ------------------------- Huawei Health (sueño) -------------------------
   El fichero que sale de scripts/salud-arc.mjs: { v:1, fuente, desde, hasta,
   dias:{ "AAAA-MM-DD": { sueno (min), acuesta, levanta, siesta, pasos,
   caminata (min) } } }. Se importa en el movil y se guarda aparte. Cada
   importacion suma dias; los repetidos se quedan con lo ultimo.          */
function limpiaDiaSalud(v){
  if(!esObj(v)) return null;
  var o={}, n=0;
  if(typeof v.sueno==="number" && v.sueno>=0 && v.sueno<1440){ o.sueno=Math.round(v.sueno); n++; }
  if(esHora(v.acuesta)) o.acuesta=v.acuesta;
  if(esHora(v.levanta)) o.levanta=v.levanta;
  if(typeof v.siesta==="number" && v.siesta>=0 && v.siesta<1440) o.siesta=Math.round(v.siesta);
  if(typeof v.pasos==="number" && v.pasos>=0 && v.pasos<200000){ o.pasos=Math.round(v.pasos); n++; }
  if(typeof v.caminata==="number" && v.caminata>=0 && v.caminata<1440){ o.caminata=Math.round(v.caminata); n++; }
  return n ? o : null;
}
function leeSalud(texto){
  var j; try{ j=JSON.parse(texto); }catch(e){ return { error:"Ese fichero no es de Copiloto: no se puede leer." }; }
  if(!esObj(j) || !esObj(j.dias)) return { error:"Ese fichero no trae días de salud. Tiene que ser el de scripts/salud-arc.mjs." };
  if(typeof j.v==="number" && j.v>1) return { error:"El fichero es de una versión más nueva. Actualiza la app." };
  var dias={}, n=0;
  Object.keys(j.dias).forEach(function(d){ if(!esFecha(d)) return; var v=limpiaDiaSalud(j.dias[d]); if(v){ dias[d]=v; n++; } });
  if(!n) return { error:"El fichero no trae ningún día con datos." };
  return { ok:true, dias:dias, n:n, fuente: typeof j.fuente==="string" ? j.fuente.slice(0,40) : "Huawei Health" };
}
function mezclaSalud(actual,nuevo){
  var S2={ v:1, fuente:nuevo.fuente, dias:{} };
  Object.keys((actual && actual.dias) || {}).forEach(function(d){ S2.dias[d]=actual.dias[d]; });
  Object.keys(nuevo.dias).forEach(function(d){ S2.dias[d]=nuevo.dias[d]; });
  var f=Object.keys(S2.dias).sort(); S2.desde=f[0]; S2.hasta=f[f.length-1];
  return S2;
}
function cargaSalud(almacen){
  try{ var j=JSON.parse(almacen.getItem(K_SALUD)||"null"); if(!j || !esObj(j.dias)) return null;
       var L=leeSalud(JSON.stringify(j)); return L.ok ? mezclaSalud(null,L) : null; }catch(e){ return null; }
}
function guardaSalud(almacen,S2){ try{ almacen.setItem(K_SALUD,JSON.stringify(S2)); return true; }catch(e){ return false; } }

/* --------------------------- lo hecho, por dia -------------------------- */
function tipoAct(a){
  var dep=a.deporte||"";
  if(a.fuente==="hevy" || /Weight|Workout|Crossfit|Training/i.test(dep)) return "gym";
  if(/Walk|Hike/i.test(dep)) return "caminar";
  if(/Run/.test(dep)) return "correr";
  return "otro";
}
function esCaminata(e){ return !!e && !e.plan && e.tipo!=="gym" && typeof e.titulo==="string" && RE_CAMINA.test(e.titulo); }
// el mismo emparejamiento que la agenda: calle con carrera al aire libre,
// cinta con carrera de interior, gimnasio con fuerza (Hevy); y andar con una
// caminata grabada o, si no se grabo, con los pasos de Huawei
function compatible(e,a){
  var run=/Run/.test(a.deporte||"");
  if(esCaminata(e)) return tipoAct(a)==="caminar";
  if(!e.plan && (e.tipo==="fuera" || e.tipo==="cinta")) return run;
  if(e.tipo==="fuera") return run && !a.cinta;
  if(e.tipo==="cinta") return run && (!!a.cinta || /Virtual/.test(a.deporte||""));
  if(e.tipo==="gym") return tipoAct(a)==="gym";
  return false;
}
/* "Cumplir el plan de Entreno": las sesiones del dia (calle, cinta, gimnasio
   o andar; un "Descanso" o un evento suelto no es sesion) contra lo hecho.
   Cada actividad vale para una sola sesion. Sin sesiones, se cumple sola.  */
// Una caminata sin registro (ni grabada ni pasos de Huawei ese dia) no se
// exige: ni suma ni resta ("caminata sin registro"). Con los pasos de ese dia
// por debajo de 8.000 y nada grabado, si cuenta como sin hacer.
function planDelDia(E,A,sal){
  var ses=(E||[]).filter(function(e){ return esCaminata(e) || e.tipo==="fuera" || e.tipo==="cinta" || e.tipo==="gym"; });
  var usadas={}, hechas=0, pasosUsados=false, sinRegistro=0;
  ses.forEach(function(e){
    for(var i=0;i<(A||[]).length;i++) if(!usadas[i] && compatible(e,A[i])){ usadas[i]=1; hechas++; return; }
    if(!esCaminata(e)) return;
    if(!pasosUsados && sal && ((sal.caminata||0)>0 || (sal.pasos||0)>=PASOS_CAMINATA)){ pasosUsados=true; hechas++; return; }
    if(!(sal && typeof sal.pasos==="number")) sinRegistro++;
  });
  var o={ s:ses.length-sinRegistro, h:hechas }; if(sinRegistro) o.sinRegistro=sinRegistro;
  return o;
}
function ctxDe(c){
  if(Array.isArray(c)) return { acts:c, eventos:null, salud:null };
  return { acts:(c && c.acts) || [], eventos:(c && c.eventos) || null, salud:(c && c.salud) || null };
}
function actsDel(acts,iso){ return acts.filter(function(a){ return a && a.fecha===iso; }); }
function saludDe(c,iso){ return c.salud && c.salud[iso] || null; }
// el plan de un dia: lo del calendario si esta; si no, lo que se guardo.
// Si Strava ya no trae una actividad vieja, vale lo guardado (nunca resta).
function planDe(D,iso,c){
  var g=D.plan[iso]||null, E=c.eventos ? c.eventos(iso) : null;
  if(!E) return g;
  var p=planDelDia(E,actsDel(c.acts,iso),saludDe(c,iso));
  if(g && g.s===p.s && g.h>p.h) p.h=g.h;
  return p;
}
// guarda en Arc lo que traigan el calendario y Strava/Hevy, para que no se
// pierda cuando la copia deje de llegar tan atras
function registraAuto(D,c,hoy){
  c=ctxDe(c);
  var cambia=false;
  c.acts.forEach(function(a){
    if(!a || !enArc(a.fecha) || a.fecha>hoy) return;
    var t=tipoAct(a), o=D.auto[a.fecha]||(D.auto[a.fecha]={});
    if(!o[t]){ o[t]=1; cambia=true; }
  });
  if(c.eventos){
    var ult = hoy<FIN ? hoy : FIN;
    for(var d=INICIO; d<=ult; d=mas(d,1)){
      var p=planDe(D,d,c), g=D.plan[d];
      if(p && (!g || g.s!==p.s || g.h!==p.h)){ D.plan[d]={ s:p.s, h:p.h }; cambia=true; }
    }
  }
  return cambia;
}
function autoDe(D,acts,iso){
  var o={}, g=D.auto[iso]||{}, k;
  for(k in g) o[k]=1;
  acts.forEach(function(a){ if(a && a.fecha===iso) o[tipoAct(a)]=1; });
  return o;
}
function marcado(D,iso,id){ return !!(D.checks[iso] && D.checks[iso][id]); }
/* Una regla en un dia -> { ok: true | false | null (sin datos), como }.
   como: "toque" (marcada a mano), "dato" (Huawei), "auto" (calendario,
   Strava, Hevy), "a mano" (lo automatico marcado "hecho sin registrar").  */
function okRegla(D,r,iso,c){
  var m=marcado(D,iso,r.id);
  if(r.tipo==="manual"){
    if(m) return { ok:true, como:"toque" };
    var sal=saludDe(c,iso);
    if(r.dato==="sueno" && sal && typeof sal.sueno==="number") return { ok:sal.sueno>=SUENO_MIN, como:"dato", sueno:sal.sueno };
    if(iso<(r.alta||INICIO)) return { ok:null, sinDatos:true };
    return { ok:false };
  }
  if(r.fuente==="plan"){
    var p=planDe(D,iso,c);
    if(p && p.h>=p.s) return { ok:true, como:"auto", plan:p };
    if(m) return { ok:true, como:"a mano", plan:p };
    if(!p) return { ok:null, sinDatos:true };
    return { ok:false, plan:p };
  }
  var a=autoDe(D,c.acts,iso);
  var ok = r.fuente==="entreno" ? !!(a.correr||a.gym||a.otro||a.caminar) : !!a[r.fuente];
  if(ok) return { ok:true, como:"auto" };
  if(m) return { ok:true, como:"a mano" };
  return { ok:false };
}

/* ------------------------------ un dia ------------------------------
   estado: futuro, hoy (sin cerrar todavia), cumplido, fallado, o vacio
   (ninguna regla con datos ese dia: "sin datos").                        */
function estadoDia(D,iso,hoy,c){
  c=ctxDe(c);
  var R=D.reglas.map(function(r){ var x = iso>hoy ? { ok:false } : okRegla(D,r,iso,c); x.regla=r; return x; });
  var val=R.filter(function(x){ return x.ok!==null; });
  var hechas=val.filter(function(x){ return x.ok; }).length;
  var todas=val.length>0 && hechas===val.length, est;
  if(iso>hoy) est="futuro";
  else if(!val.length) est="vacio";
  else if(todas) est="cumplido";
  else est = iso===hoy ? "hoy" : "fallado";
  return { iso:iso, dia:diaArc(iso), semana:semanaArc(iso), reglas:R, hechas:hechas, cuentan:val.length,
           pct: val.length ? hechas/val.length : 0, estado:est, sinDatos: R.length-val.length };
}
// dias fallados seguidos que terminan ayer (hoy aun esta abierto)
function fallosSeguidos(D,hoy,c){
  if(!D.reglas.length) return 0;
  var n=0, d=mas(hoy,-1);
  while(enArc(d) && estadoDia(D,d,hoy,c).estado==="fallado"){ n++; d=mas(d,-1); }
  return n;
}
// cuentan los dias ya pasados y hoy solo si ya esta cerrado; "sin datos" no cuenta
function cuenta(D,desde,hasta,hoy,c){
  c=ctxDe(c);
  var ult = hasta<hoy ? hasta : hoy, dias=0, cumplidos=0, sinDatos=0, i;
  var por=D.reglas.map(function(r){ return { regla:r, ok:0, total:0, pct:null }; });
  for(var d=desde; d<=ult; d=mas(d,1)){
    var e=estadoDia(D,d,hoy,c);
    if(e.estado==="vacio"){ sinDatos++; continue; }
    if(d<hoy || e.estado==="cumplido"){ dias++; if(e.estado==="cumplido") cumplidos++; }
    for(i=0;i<e.reglas.length;i++){
      var x=e.reglas[i]; if(x.ok===null) continue;
      if(d<hoy || x.ok){ por[i].total++; if(x.ok) por[i].ok++; }
    }
  }
  por.forEach(function(p){ p.pct = p.total ? Math.round(100*p.ok/p.total) : null; });
  return { dias:dias, cumplidos:cumplidos, sinDatos:sinDatos, porRegla:por };
}
function resumen(D,hoy,c){ return cuenta(D,INICIO,FIN,hoy,c); }
// la revision de cada semana: se abre su ultimo dia (domingo, o el 31/12)
function revision(D,hoy,c){
  return SEMANAS.filter(function(s){ return s.desde<=hoy; }).map(function(s){
    var k=cuenta(D,s.desde,s.hasta,hoy,c);
    return { n:s.n, desde:s.desde, hasta:s.hasta, dias:s.dias, abierta:hoy>=s.hasta, pasada:hoy>s.hasta,
             contados:k.dias, cumplidos:k.cumplidos, sinDatos:k.sinDatos, porRegla:k.porRegla, nota:D.notas[s.n]||"" };
  });
}

/* ----------------------------- la fuerza -----------------------------
   Como Loop Habit Tracker (github.com/iSoron/uhabits, Score.compute): cada
   regla tiene una fuerza de 0 a 100 %. Cada dia cumplido la acerca a 100 y
   cada fallo la baja un poco (vida media de 13 dias). Nunca la tira a cero.
     fuerza = anterior * M + (hecho ? 1 : 0) * (1 - M),   M = 0,5^(1/13)
   Un dia sin datos o hoy aun abierto no la cambian.                      */
var M=Math.pow(0.5,1/13);
function fuerzas(D,hoy,c){
  c=ctxDe(c);
  var ult = hoy<FIN ? hoy : FIN;
  var R=D.reglas.map(function(r){ return { regla:r, v:0, serie:{}, visto:false, n:0 }; }), serie=[];
  for(var d=INICIO; d<=ult; d=mas(d,1)){
    var e=estadoDia(D,d,hoy,c);
    for(var i=0;i<R.length;i++){
      var x=e.reglas[i], r=R[i];
      if(x.ok!==null && !(d===hoy && !x.ok)){ r.v = r.v*M + (x.ok?1:0)*(1-M); r.visto=true; r.n++; }
      r.serie[d]=r.v;
    }
    // la media pesa cada regla por los dias que lleva con datos: una regla recien
    // empezada no hunde la fuerza de las que llevan todo el Arc
    var pes=R.reduce(function(s,r){ return s+r.n; },0);
    serie.push({ d:d, v: pes ? Math.round(100*R.reduce(function(s,r){ return s+r.serie[d]*r.n; },0)/pes) : 0 });
  }
  var hace=mas(ult,-7), pct=function(v){ return Math.round(100*(v||0)); };
  function en(d){ var s=serie.filter(function(x){ return x.d===d; })[0]; return s ? s.v : 0; }
  return {
    arc: serie.length ? serie[serie.length-1].v : 0,
    hace7: hace>=INICIO ? en(hace) : 0,
    en: en,
    serie: serie,
    porRegla: R.map(function(r){ return { regla:r.regla, v:pct(r.v), hace7: hace>=INICIO ? pct(r.serie[hace]) : 0 }; })
  };
}
/* ------------------------ lo hecho, en numeros ------------------------
   Solo lo que traen Strava, Hevy y Huawei. Nada estimado.               */
function totales(acts,desde,hasta){
  var t={ km:0, horas:0, kg:0, carreras:0, gym:0, sesiones:0 };
  (acts||[]).forEach(function(a){
    if(!a || !a.fecha || a.fecha<desde || a.fecha>hasta) return;
    var ti=tipoAct(a); t.sesiones++; t.horas+=(a.mov||0)/3600;
    if(ti==="correr"){ t.km+=(a.distancia||0)/1000; t.carreras++; }
    if(ti==="gym"){ t.kg+=a.volumenKg||0; t.gym++; }
  });
  return t;
}
// sesiones del calendario Entreno hechas / previstas entre dos fechas (hasta hoy)
function planTotal(D,desde,hasta,hoy,c){
  c=ctxDe(c);
  var ult = hasta<hoy ? hasta : hoy, t={ s:0, h:0 };
  for(var d=desde; d<=ult; d=mas(d,1)){ var p=planDe(D,d,c); if(p){ t.s+=p.s; t.h+=p.h; } }
  return t;
}
// el sueño de unas fechas: media, hora media de acostarse y de levantarse
// (la de acostarse se promedia alrededor de medianoche: 23:30 y 00:30 -> 00:00)
function minDe(h){ var p=h.split(":"); return (+p[0])*60+(+p[1]); }
function hDe(m){ m=((Math.round(m)%1440)+1440)%1440; return dos(Math.floor(m/60))+":"+dos(m%60); }
function suenoDe(salud,desde,hasta){
  var n=0, tot=0, ok=0, ac=[], lv=[];
  Object.keys(salud||{}).forEach(function(d){
    if(d<desde || d>hasta) return; var v=salud[d]; if(typeof v.sueno!=="number") return;
    n++; tot+=v.sueno; if(v.sueno>=SUENO_MIN) ok++;
    if(v.acuesta){ var a=minDe(v.acuesta); ac.push(a<720 ? a+1440 : a); }
    if(v.levanta) lv.push(minDe(v.levanta));
  });
  function media(L){ return L.length ? L.reduce(function(s,x){ return s+x; },0)/L.length : null; }
  return { noches:n, media: n ? Math.round(tot/n) : null, conSiete:ok,
           acuesta: ac.length ? hDe(media(ac)) : null, levanta: lv.length ? hDe(media(lv)) : null };
}
function horasTxt(min){ return Math.floor(min/60)+" h "+dos(min%60); }
// una etapa: dias, dias cumplidos, fuerza al empezar y ahora, lo hecho y el sueño
function statsEtapa(D,e,hoy,c,F){
  c=ctxDe(c);
  var dias=entre(e.desde,e.hasta)+1, estado = hoy<e.desde ? "futura" : hoy>e.hasta ? "pasada" : "actual";
  var ult = e.hasta<hoy ? e.hasta : hoy;
  var k = estado==="futura" ? { dias:0, cumplidos:0, sinDatos:0 } : cuenta(D,e.desde,e.hasta,hoy,c);
  return { estado:estado, dias:dias,
           llevas: estado==="futura" ? 0 : entre(e.desde,ult)+1,
           faltan: estado==="pasada" ? 0 : estado==="futura" ? dias : entre(ult,e.hasta),
           empiezaEn: estado==="futura" ? entre(hoy,e.desde) : 0,
           cumplidos:k.cumplidos, contados:k.dias, sinDatos:k.sinDatos,
           fuerzaIni: e.desde>INICIO && F ? F.en(mas(e.desde,-1)) : 0,
           fuerzaAhora: estado==="futura" || !F ? null : F.en(ult),
           hecho: estado==="futura" ? null : totales(c.acts,e.desde,ult),
           plan: estado==="futura" ? null : planTotal(D,e.desde,e.hasta,hoy,c),
           sueno: estado==="futura" ? null : suenoDe(c.salud,e.desde,ult) };
}

/* --------------------------- la hoja de ruta ---------------------------
   El miliario de cada etapa cuenta los dias hasta su siguiente destino real.
   Van por id de etapa: si se renombra, no se pierden. Una etapa creada a mano
   cuenta hasta su ultimo dia.                                           */
var DESTINOS={
  e1:[{ fecha:"2026-09-27", arriba:"DÍAS AL", abajo:"TEST 20K", cero:["HOY","20K"], icono:"sneaker-move", plur:"días al test de 20 km", sing:"día al test de 20 km", hoyTxt:"hoy es el test de 20 km" }],
  e2:[{ fecha:"2026-10-18", arriba:"DÍAS A", abajo:"ROMA", cero:["HOY","ROMA"], icono:"flag-checkered", plur:"días a Roma", sing:"día a Roma", hoyTxt:"hoy corres en Roma" },
      { fecha:"2026-10-26", arriba:"DÍAS PARA", abajo:"TRAVESÍA", cero:["HOY","TRAVESÍA"], icono:"globe-hemisphere-west", plur:"días de recuperar", sing:"día de recuperar", hoyTxt:"empieza la Travesía" }],
  e3:[{ fecha:"2026-11-03", arriba:"DÍAS A", abajo:"MÉXICO", cero:["HOY","MÉXICO"], icono:"bandera-mexico", plur:"días a México", sing:"día a México", hoyTxt:"hoy vuelas a México" },
      { fecha:"2026-11-18", arriba:"DÍAS PARA", abajo:"VOLVER", cero:["HOY","MADRID"], icono:"airplane-tilt", plur:"días para volver", sing:"día para volver", hoyTxt:"hoy vuelves a Madrid" },
      { fecha:"2026-11-24", arriba:"DÍAS A", abajo:"ÁMSTERDAM", cero:["HOY","ÁMSTERDAM"], icono:"tulipanes", plur:"días a Ámsterdam", sing:"día a Ámsterdam", hoyTxt:"hoy vuelas a Ámsterdam" },
      { fecha:"2026-11-30", arriba:"DÍAS PARA", abajo:"LA VUELTA", cero:["HOY","VUELTA"], icono:"house-line", plur:"días para la Vuelta", sing:"día para la Vuelta", hoyTxt:"empieza la Vuelta" }],
  e4:[{ fecha:"2026-12-19", arriba:"DÍAS A", abajo:"CORUÑA", cero:["HOY","CORUÑA"], icono:"torre-hercules", plur:"días a Coruña", sing:"día a Coruña", hoyTxt:"hoy vuelas a Coruña" },
      { fecha:"2026-12-21", arriba:"DÍAS PARA", abajo:"EL FARO", cero:["HOY","FARO"], icono:"torre-hercules", plur:"días para el Faro", sing:"día para el Faro", hoyTxt:"empieza el Faro" }],
  e5:[{ fecha:"2026-12-31", arriba:"DÍAS PARA", abajo:"SELLAR", cero:["HOY SE","SELLA"], icono:"seal-check", plur:"días para sellar el Arc", sing:"día para sellar el Arc", hoyTxt:"hoy se sella el Arc" }]
};
// lo que pide cada fase (la consigna). Por id; una fase nueva no lleva
var CONSIGNAS={ e1:"Subir la intensidad sin romperse", e2:"Llegar a Roma con el plan hecho y recuperar",
                e3:"De viaje, nunca falles dos veces", e4:"Recuperar el ritmo en casa", e5:"Cerrar el año con la fuerza más alta del Arc" };
var ROMANOS=["I","II","III","IV","V","VI"];
function romano(n){ return ROMANOS[n-1] || String(n); }
function destinoDe(D,e,hoy){
  var L=(DESTINOS[e.id]||[]).filter(function(d){ return d.fecha>=e.desde && d.fecha<=mas(e.hasta,1); });
  var d=null, i;
  for(i=0;i<L.length;i++) if(L[i].fecha>=hoy){ d=L[i]; break; }
  if(!d) d={ fecha:e.hasta, arriba:"DÍAS DE", abajo:e.nombre.toUpperCase(), cero:["ÚLTIMO","DÍA"], icono:"path",
             plur:"días de "+e.nombre, sing:"día de "+e.nombre, hoyTxt:"último día de "+e.nombre };
  var n=Math.max(0,entre(hoy,d.fecha));
  return { fecha:d.fecha, n:n, icono:d.icono,
           arriba: n===1 ? d.arriba.replace("DÍAS","DÍA") : d.arriba, abajo:d.abajo, cero:d.cero,
           frase: n===0 ? d.hoyTxt : n+" "+(n===1 ? d.sing : d.plur) };
}
function viajesDe(D){ return (D.viajes||[]).slice().sort(function(a,b){ return (a.fecha||"9") < (b.fecha||"9") ? -1 : (a.fecha||"9") > (b.fecha||"9") ? 1 : 0; }); }
function viajesEntre(D,desde,hasta){ return viajesDe(D).filter(function(v){ return v.fecha && v.fecha>=desde && v.fecha<=hasta; }); }
function textoViaje(v){ return (v.de ? v.de+" → " : "")+v.a+(v.via ? ", vía "+v.via : ""); }
// la linea de la etapa en la tarjeta del dia (HOY): numeral, nombre y lo que viene
function lineaEtapa(D,hoy,deVerdad){
  var x=etapaDe(D,hoy); if(!x) return null;
  var e=x.etapa, pre=romano(x.n)+" "+e.nombre+" · ";
  if(deVerdad && deVerdad!==hoy) return pre+"día "+(entre(e.desde,hoy)+1)+" de "+(entre(e.desde,e.hasta)+1);
  if(hoy===e.desde && x.n>1) return pre+"empieza hoy";
  var v=viajesDe(D).filter(function(v){ return v.fecha===hoy && !v.posible; })[0];
  if(v && hoy!==CARRERA.fecha) return pre+"hoy, "+(v.de ? v.de+" → " : "")+v.a;
  return pre+destinoDe(D,e,hoy).frase;
}
// "nunca falles dos veces": de los dias a medias, cuantos fueron seguidos de
// uno cumplido. Solo cuentan dias cerrados.
function volviste(D,desde,hasta,hoy,c){
  var f=0, v=0, ult = hasta<hoy ? hasta : mas(hoy,-1);
  for(var d=desde; d<=ult; d=mas(d,1)){
    if(estadoDia(D,d,hoy,c).estado!=="fallado") continue;
    var nd=mas(d,1); if(nd>hoy || !enArc(nd)) continue;
    var en=estadoDia(D,nd,hoy,c).estado;
    if(nd===hoy && en!=="cumplido") continue;          // hoy aun esta abierto
    f++; if(en==="cumplido") v++;
  }
  return { f:f, v:v };
}
// km por semana: septiembre frente a las ultimas 4 semanas
function kmSemana(acts,hoy){
  var ult = hoy<FIN ? hoy : FIN;
  return { sept: totales(acts,"2026-09-01","2026-09-30").km*7/30, ahora: totales(acts,mas(ult,-27),ult).km/4 };
}
function viajeValido(v){
  return esObj(v) && typeof v.id==="string" && typeof v.a==="string" && v.a.trim() &&
    (v.fecha==="" ? !!v.posible : esFecha(v.fecha)) && (!v.llega || esFecha(v.llega));
}
function limpiaViajeGuardado(v){
  var o={ id:v.id, fecha:v.fecha||"", de:String(v.de||"").trim().slice(0,40), a:v.a.trim().slice(0,40) };
  if(v.via && String(v.via).trim()) o.via=String(v.via).trim().slice(0,40);
  if(v.llega && v.llega>=o.fecha) o.llega=v.llega;
  if(v.posible) o.posible=true;
  return o;
}
function limpiaViaje(x){
  var a=String(x && x.a || "").replace(/\s+/g," ").trim(), de=String(x && x.de || "").replace(/\s+/g," ").trim();
  if(!a) return { error:"Pon a dónde vas." };
  if(a.length>40 || de.length>40) return { error:"Máximo 40 letras por ciudad." };
  var fecha=x.fecha||"";
  if(fecha && !esFecha(fecha)) return { error:"Fecha no válida." };
  if(!fecha && !x.posible) return { error:"Sin fecha solo puede ser un viaje posible." };
  if(fecha && !enArc(fecha)) return { error:"Tiene que estar entre el 1 de septiembre y el 31 de diciembre." };
  var v={ fecha:fecha, de:de, a:a }; if(x.posible) v.posible=true;
  var via=String(x.via||"").trim(); if(via) v.via=via.slice(0,40);
  if(x.llega){ if(!esFecha(x.llega) || x.llega<fecha) return { error:"La llegada es antes de la salida." }; v.llega=x.llega; }
  return { viaje:v };
}
function anadeViaje(D,x){
  var L=D.viajes||(D.viajes=[]); if(L.length>=30) return { error:"Máximo 30 viajes." };
  var l=limpiaViaje(x); if(l.error) return l;
  var n=1; while(L.some(function(v){ return v.id==="v"+n; })) n++;
  l.viaje.id="v"+n; L.push(l.viaje); return { ok:true, viaje:l.viaje };
}
function ponViaje(D,id,x){
  var L=D.viajes||[], i; for(i=0;i<L.length;i++) if(L[i].id===id) break;
  if(i>=L.length) return { error:"Ese viaje ya no está." };
  var ant=L[i];
  if(x.llega && ant.fecha && x.fecha && x.fecha!==ant.fecha) x.llega=mas(x.llega,entre(ant.fecha,x.fecha));
  var l=limpiaViaje(x); if(l.error) return l;
  l.viaje.id=id; L[i]=l.viaje; return { ok:true };
}
function borraViaje(D,id){ D.viajes=(D.viajes||[]).filter(function(v){ return v.id!==id; }); return { ok:true }; }

/* ----------------------------- cambios ----------------------------- */
var BLOQUEADAS="Las reglas están bloqueadas desde el 1 de octubre.";
function nuevoId(D){ var i=1; while(D.reglas.some(function(r){ return r.id==="r"+i; })) i++; return "r"+i; }
function limpiaRegla(x){
  var nombre=String(x && x.nombre || "").replace(/\s+/g," ").trim();
  var tipo = x && x.tipo==="auto" ? "auto" : "manual";
  var fuente = tipo==="auto" ? (FUENTES[x.fuente] ? x.fuente : null) : null;
  if(tipo==="auto" && !fuente) return { error:"Elige de dónde sale la regla automática." };
  if(!nombre && tipo==="auto") nombre=FUENTES[fuente].replace(/ \(.*\)$/,"");
  if(!nombre) return { error:"Ponle un nombre a la regla." };
  if(nombre.length>MAX_NOMBRE) return { error:"Máximo "+MAX_NOMBRE+" letras." };
  var r={ nombre:nombre, tipo:tipo }; if(fuente) r.fuente=fuente;
  return { regla:r };
}
function indice(D,id){ for(var i=0;i<D.reglas.length;i++) if(D.reglas[i].id===id) return i; return -1; }
function anadeRegla(D,x,hoy){
  if(!editable(hoy)) return { error:BLOQUEADAS };
  if(D.reglas.length>=MAX_REGLAS) return { error:"Ya tienes "+MAX_REGLAS+" reglas, el máximo." };
  var l=limpiaRegla(x); if(l.error) return l;
  l.regla.id=nuevoId(D); l.regla.ancla = l.regla.tipo==="auto" ? "20:00" : "21:00";
  if(l.regla.tipo==="manual") l.regla.alta = enArc(hoy) ? hoy : INICIO;
  D.reglas.push(l.regla);
  return { ok:true, regla:l.regla };
}
function editaRegla(D,id,x,hoy){
  if(!editable(hoy)) return { error:BLOQUEADAS };
  var i=indice(D,id); if(i<0) return { error:"Esa regla ya no está." };
  var l=limpiaRegla(x); if(l.error) return l;
  var ant=D.reglas[i];
  if(ant.tipo!==l.regla.tipo || ant.fuente!==l.regla.fuente) Object.keys(D.checks).forEach(function(d){ delete D.checks[d][id]; });
  l.regla.id=id; l.regla.ancla=ant.ancla;
  if(l.regla.tipo==="manual") l.regla.alta = ant.alta || (enArc(hoy) ? hoy : INICIO);
  if(ant.nombre===l.regla.nombre && ant.tipo===l.regla.tipo){ if(ant.ayuda) l.regla.ayuda=ant.ayuda; if(ant.dato) l.regla.dato=ant.dato; }
  D.reglas[i]=l.regla;
  return { ok:true, regla:l.regla };
}
function borraRegla(D,id,hoy){
  if(!editable(hoy)) return { error:BLOQUEADAS };
  var i=indice(D,id); if(i<0) return { error:"Esa regla ya no está." };
  D.reglas.splice(i,1);
  Object.keys(D.checks).forEach(function(d){ delete D.checks[d][id]; });
  return { ok:true };
}
// la hora ancla solo coloca la regla en la linea del dia (diseno B)
function ponAncla(D,id,h){
  var i=indice(D,id); if(i<0) return { error:"Esa regla ya no está." };
  if(!esHora(h)) return { error:"Hora no válida." };
  D.reglas[i].ancla=h;
  return { ok:true };
}
// el objetivo se escribe hasta el 30/09; si el 1/10 sigue vacio, una vez mas
function objetivoEditable(D,hoy){ return editable(hoy) || !String(D.objetivo||"").trim(); }
function ponObjetivo(D,t,hoy){
  if(!objetivoEditable(D,hoy)) return { error:"El objetivo se fijó el 1 de octubre." };
  D.objetivo=String(t||"").replace(/\s+/g," ").slice(0,MAX_OBJETIVO);
  return { ok:true };
}
/* un toque: dias del Arc y nunca el futuro. En una manual es "hecho"; en una
   automatica es "hecho sin registrar" (lo hiciste y no se grabo).        */
function marcaCheck(D,iso,id,valor,hoy){
  if(!enArc(iso)) return { error:"Solo se marca dentro del Arc (1/9 – 31/12)." };
  if(iso>hoy) return { error:"Ese día todavía no ha llegado." };
  if(indice(D,id)<0) return { error:"Esa regla ya no está." };
  var c=D.checks[iso]||(D.checks[iso]={});
  if(valor) c[id]=1; else delete c[id];
  if(!Object.keys(c).length) delete D.checks[iso];
  return { ok:true };
}
function ponNota(D,n,texto){
  var t=String(texto||"").slice(0,500);
  if(t.trim()) D.notas[n]=t; else delete D.notas[n];
  return { ok:true };
}
function limpiaEtapa(x){
  var nombre=String(x && x.nombre || "").replace(/\s+/g," ").trim();
  if(!nombre) return { error:"Ponle un nombre a la etapa." };
  if(nombre.length>MAX_ETAPA) return { error:"Máximo "+MAX_ETAPA+" letras para el nombre." };
  if(!esFecha(x.desde) || !esFecha(x.hasta)) return { error:"Pon las dos fechas." };
  if(x.desde>x.hasta) return { error:"La etapa acaba antes de empezar." };
  if(x.desde<INICIO || x.hasta>FIN) return { error:"Tiene que estar entre el 1 de septiembre y el 31 de diciembre." };
  var e={ nombre:nombre, desde:x.desde, hasta:x.hasta };
  var sub=String(x.sub||"").replace(/\s+/g," ").trim();
  if(sub.length>MAX_SUB) return { error:"Máximo "+MAX_SUB+" letras para el subtítulo." };
  if(sub) e.sub=sub;
  return { etapa:e };
}
function ponEtapa(D,id,x){
  var L=D.etapas||[], i; for(i=0;i<L.length;i++) if(L[i].id===id) break;
  if(i>=L.length) return { error:"Esa etapa ya no está." };
  var l=limpiaEtapa(x); if(l.error) return l;
  var ant=L[i]; l.etapa.id=id;
  if(ant.icono) l.etapa.icono=ant.icono;
  if(ant.hito) l.etapa.hito=ant.hito;
  if(!("sub" in x) && ant.sub) l.etapa.sub=ant.sub;
  L[i]=l.etapa; D.etapas=ordenEtapas(L);
  return { ok:true };
}
function anadeEtapa(D,x){
  var L=D.etapas||(D.etapas=[]);
  if(L.length>=MAX_ETAPAS) return { error:"Máximo "+MAX_ETAPAS+" etapas." };
  var l=limpiaEtapa(x); if(l.error) return l;
  var n=1; while(L.some(function(e){ return e.id==="u"+n; })) n++;
  l.etapa.id="u"+n; L.push(l.etapa); D.etapas=ordenEtapas(L);
  return { ok:true, etapa:l.etapa };
}
function borraEtapa(D,id){
  var L=D.etapas||[];
  if(L.length<=1) return { error:"Hace falta al menos una etapa." };
  D.etapas=L.filter(function(e){ return e.id!==id; });
  return { ok:true };
}
function leeDiseno(){ return "A"; }                        // diseño fijo: anillos
function guardaDiseno(almacen,x){ if(!DISENOS[x]) return false; try{ almacen.setItem(K_DISENO,x); return true; }catch(e){ return false; } }

/* ===========================================================================
   Lo que se ve. Iconos Phosphor (regular), sin emojis.
   =========================================================================== */
var PH={
  "airplane-tilt":"M185.33,114.21l29.14-27.42.17-.17a32,32,0,0,0-45.26-45.26c0,.06-.11.11-.17.17L141.79,70.67l-83-30.2a8,8,0,0,0-8.39,1.86l-24,24a8,8,0,0,0,1.22,12.31l63.89,42.59L76.69,136H56a8,8,0,0,0-5.65,2.34l-24,24A8,8,0,0,0,29,175.42l36.82,14.73,14.7,36.75.06.16a8,8,0,0,0,13.18,2.47l23.87-23.88A8,8,0,0,0,120,200V179.31l14.76-14.76,42.59,63.89a8,8,0,0,0,12.31,1.22l24-24a8,8,0,0,0,1.86-8.39Zm-.07,97.23-42.59-63.88A8,8,0,0,0,136.8,144c-.27,0-.53,0-.79,0a8,8,0,0,0-5.66,2.35l-24,24A8,8,0,0,0,104,176v20.69L90.93,209.76,79.43,181A8,8,0,0,0,75,176.57l-28.74-11.5L59.32,152H80a8,8,0,0,0,5.66-2.34l24-24a8,8,0,0,0-1.22-12.32L44.56,70.74l13.5-13.49,83.22,30.26a8,8,0,0,0,8.56-2L180.78,52.6A16,16,0,0,1,203.4,75.23l-32.87,30.93a8,8,0,0,0-2,8.56l30.26,83.22Z",
  "barbell":"M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.82c0,.06,0,.12,0,.18s0,.12,0,.18V192Zm32-24H208V88h16Z",
  "book-open":"M232,48H160a40,40,0,0,0-32,16A40,40,0,0,0,96,48H24a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H96a24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24h72a8,8,0,0,0,8-8V56A8,8,0,0,0,232,48ZM96,192H32V64H96a24,24,0,0,1,24,24V200A39.81,39.81,0,0,0,96,192Zm128,0H160a39.81,39.81,0,0,0-24,8V88a24,24,0,0,1,24-24h64Z",
  "calendar-check":"M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-38.34-85.66a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L116,164.69l42.34-42.35A8,8,0,0,1,169.66,122.34Z",
  "caret-right":"M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z",
  "check":"M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z",
  "check-circle":"M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z",
  "circle":"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z",
  "clock":"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z",
  "flag-checkered":"M227.32,48.75A8,8,0,0,0,218.76,50c-28,24.22-51.72,12.48-79.21-1.13C111.07,34.76,78.78,18.79,42.76,50A8,8,0,0,0,40,56V224a8,8,0,0,0,16,0V179.77c26.79-21.16,49.87-9.75,76.45,3.41,28.49,14.09,60.77,30.06,96.79-1.13a8,8,0,0,0,2.76-6V56A8,8,0,0,0,227.32,48.75ZM216,71.6v40.65c-14,11.06-27,13.22-40,10.88V79.34A60.05,60.05,0,0,0,216,71.6Zm-56,3.76v43c-6.66-2.67-13.43-6-20.45-9.48-8.82-4.37-18-8.91-27.55-12.18v-43c6.66,2.66,13.43,6,20.45,9.48C141.27,67.55,150.46,72.09,160,75.36ZM96,48.91V92.69a60.06,60.06,0,0,0-40,7.75V59.78C70,48.72,83,46.57,96,48.91ZM86.58,152A60.06,60.06,0,0,0,56,160.43V119.78c14-11.06,27-13.22,40-10.88v43.8A65.61,65.61,0,0,0,86.58,152ZM112,156.67v-43c6.66,2.66,13.43,6,20.45,9.48,8.82,4.37,18,8.9,27.55,12.17v43c-6.66-2.67-13.43-6-20.45-9.48C130.73,164.47,121.54,159.94,112,156.67Zm64,26.45v-43.8a65.61,65.61,0,0,0,9.42.72A60.11,60.11,0,0,0,216,131.57v40.68C202,183.31,189,185.46,176,183.12Z",
  "globe-hemisphere-west":"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM143.31,41.34,152,56.9,125.09,81.24,112.85,88H96.14a16,16,0,0,0-13.88,8l-8.73,15.23L63.38,84.19,74.32,58.32a87.87,87.87,0,0,1,69-17ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Zm102.58,86.78,1.13-5.81a16.09,16.09,0,0,0-4-13.9,1.85,1.85,0,0,1-.14-.14L120,174.74,133.7,144l22.82,3.08,45.72,28.12A88.18,88.18,0,0,1,142.58,214.78Z",
  "hand-tap":"M56,76a60,60,0,0,1,120,0,8,8,0,0,1-16,0,44,44,0,0,0-88,0,8,8,0,1,1-16,0Zm140,44a27.9,27.9,0,0,0-13.36,3.39A28,28,0,0,0,144,106.7V76a28,28,0,0,0-56,0v80l-3.82-6.13a28,28,0,0,0-48.41,28.17l29.32,50A8,8,0,1,0,78.89,220L49.6,170a12,12,0,1,1,20.78-12l.14.23,18.68,30A8,8,0,0,0,104,184V76a12,12,0,0,1,24,0v68a8,8,0,1,0,16,0V132a12,12,0,0,1,24,0v20a8,8,0,0,0,16,0v-4a12,12,0,0,1,24,0v36c0,21.61-7.1,36.3-7.16,36.42a8,8,0,0,0,3.58,10.73A7.9,7.9,0,0,0,208,232a8,8,0,0,0,7.16-4.42c.37-.73,8.85-18,8.85-43.58V148A28,28,0,0,0,196,120Z",
  "house-line":"M240,208H224V136l2.34,2.34A8,8,0,0,0,237.66,127L139.31,28.68a16,16,0,0,0-22.62,0L18.34,127a8,8,0,0,0,11.32,11.31L32,136v72H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM48,120l80-80,80,80v88H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48Zm96,88H112V160h32Z",
  "lighthouse":"M208,80a8,8,0,0,0-8,8v16H188.85L184,55.2A8,8,0,0,0,181.32,50L138.44,11.88l-.2-.17a16,16,0,0,0-20.48,0l-.2.17L74.68,50A8,8,0,0,0,72,55.2L67.15,104H56V88a8,8,0,0,0-16,0v24a8,8,0,0,0,8,8H65.54l-9.47,94.48A16,16,0,0,0,72,232H184a16,16,0,0,0,15.92-17.56L190.46,120H208a8,8,0,0,0,8-8V88A8,8,0,0,0,208,80ZM128,24l27,24H101ZM87.24,64h81.52l4,40H136V88a8,8,0,0,0-16,0v16H83.23ZM72,216l4-40H180l4,40Zm106.39-56H77.61l4-40h92.76Z",
  "lightning":"M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z",
  "lock-simple":"M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z",
  "moon":"M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z",
  "path":"M200,168a32.06,32.06,0,0,0-31,24H72a32,32,0,0,1,0-64h96a40,40,0,0,0,0-80H72a8,8,0,0,0,0,16h96a24,24,0,0,1,0,48H72a48,48,0,0,0,0,96h97a32,32,0,1,0,31-40Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,200,216Z",
  "pencil-simple":"M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z",
  "seal-check":"M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-11.55,39.29c-4.79,5-9.75,10.17-12.38,16.52-2.52,6.1-2.63,13.07-2.73,19.82-.1,7-.21,14.33-3.32,17.43s-10.39,3.22-17.43,3.32c-6.75.1-13.72.21-19.82,2.73-6.35,2.63-11.52,7.59-16.52,12.38S132,224,128,224s-9.15-4.92-14.11-9.69-10.17-9.75-16.52-12.38c-6.1-2.52-13.07-2.63-19.82-2.73-7-.1-14.33-.21-17.43-3.32s-3.22-10.39-3.32-17.43c-.1-6.75-.21-13.72-2.73-19.82-2.63-6.35-7.59-11.52-12.38-16.52S32,132,32,128s4.92-9.15,9.69-14.11,9.75-10.17,12.38-16.52c2.52-6.1,2.63-13.07,2.73-19.82.1-7,.21-14.33,3.32-17.43S70.51,56.9,77.55,56.8c6.75-.1,13.72-.21,19.82-2.73,6.35-2.63,11.52-7.59,16.52-12.38S124,32,128,32s9.15,4.92,14.11,9.69,10.17,9.75,16.52,12.38c6.1,2.52,13.07,2.63,19.82,2.73,7,.1,14.33.21,17.43,3.32s3.22,10.39,3.32,17.43c.1,6.75.21,13.72,2.73,19.82,2.63,6.35,7.59,11.52,12.38,16.52S224,124,224,128,219.08,137.15,214.31,142.11ZM173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z",
  "sneaker-move":"M231.16,166.63l-28.63-14.31A47.74,47.74,0,0,1,176,109.39V80a8,8,0,0,0-8-8,48.05,48.05,0,0,1-48-48,8,8,0,0,0-12.83-6.37L30.13,76l-.2.16a16,16,0,0,0-1.24,23.75L142.4,213.66a8,8,0,0,0,5.66,2.34H224a16,16,0,0,0,16-16V180.94A15.92,15.92,0,0,0,231.16,166.63ZM224,200H151.37L40,88.63l12.87-9.76,38.79,38.79A8,8,0,0,0,103,106.34L65.74,69.11l40-30.31A64.15,64.15,0,0,0,160,87.5v21.89a63.65,63.65,0,0,0,35.38,57.24L224,180.94ZM70.8,184H32a8,8,0,0,1,0-16H70.8a8,8,0,1,1,0,16Zm40,24a8,8,0,0,1-8,8H48a8,8,0,0,1,0-16h54.8A8,8,0,0,1,110.8,208Z",
  "snowflake":"M223.77,150.09a8,8,0,0,1-5.86,9.68l-24.64,6,6.46,24.11a8,8,0,0,1-5.66,9.8A8.25,8.25,0,0,1,192,200a8,8,0,0,1-7.72-5.93l-7.72-28.8L136,141.86v46.83l21.66,21.65a8,8,0,0,1-11.32,11.32L128,203.31l-18.34,18.35a8,8,0,0,1-11.32-11.32L120,188.69V141.86L79.45,165.27l-7.72,28.8A8,8,0,0,1,64,200a8.25,8.25,0,0,1-2.08-.27,8,8,0,0,1-5.66-9.8l6.46-24.11-24.64-6a8,8,0,0,1,3.82-15.54l29.45,7.23L112,128,71.36,104.54l-29.45,7.23A7.85,7.85,0,0,1,40,112a8,8,0,0,1-1.91-15.77l24.64-6L56.27,66.07a8,8,0,0,1,15.46-4.14l7.72,28.8L120,114.14V67.31L98.34,45.66a8,8,0,0,1,11.32-11.32L128,52.69l18.34-18.35a8,8,0,0,1,11.32,11.32L136,67.31v46.83l40.55-23.41,7.72-28.8a8,8,0,0,1,15.46,4.14l-6.46,24.11,24.64,6A8,8,0,0,1,216,112a7.85,7.85,0,0,1-1.91-.23l-29.45-7.23L144,128l40.64,23.46,29.45-7.23A8,8,0,0,1,223.77,150.09Z",
  "trash":"M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z",
  "warning-circle":"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"
};
// iconos propios (mismo trazo que Phosphor regular) para lo que Phosphor no tiene
// Un icono por destino, en ilustracion plana y detallada de una sola tinta: Torre de Hercules (A Coruña), Eiffel con celosia, Chichen Itza
// (El Castillo, bloque opaco visto de lado), tulipanes (Amsterdam), Atomium de frente, Coliseo con el lado sur derrumbado y la bandera de Mexico
// con su escudo. SVG de viewBox 256 con currentColor; los tonos son opacidades. Solo el Coliseo usa --c-muro/--c-int/--c-hueco (por tema, abajo)
// para que los huecos sean siempre mas oscuros que el muro.
var PROPIOS={
  "torre-hercules":'<g fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M32 242h192"/><path d="M52 242v-14h152v14"/><path d="M98 228V100h60v128"/><path d="M88 100h80"/><path d="M98 206l60-8M98 170l60-8M98 134l60-8"/><path d="M104 100l10-28h28l10 28"/><path d="M108 72h40"/><path d="M116 72V54h24v18"/><path d="M110 54h36"/><path d="M121 54c0-11 3-17 7-17s7 6 7 17"/><path d="M128 37V26"/><path d="M108 54V34"/></g>',
  "eiffel":'<path fill-rule="evenodd" fill="currentColor" fill-opacity="0.08" d="M126.5 18L126.3 22L126 26L125.6 30L125.3 34L124.8 38L124.3 42L123.9 46L123.7 50L123.4 54L123.2 58L122.9 62L122.6 66L122.3 70L122 74L121.7 78L121.4 82L121.1 86L120.8 90L120.4 94L120.1 98L119.8 102L119.4 106L119 110L118.6 114L118.2 118L117.7 122L117.2 126L116.6 130L116 134L115.4 138L114.7 142L114 146L113.3 150L112.5 154L111.6 158L110.7 162L109.4 166L107.9 170L106.4 174L104.8 178L103 182L101.2 186L99.3 190L97.2 194L95 198L92.6 202L90.6 206L88.5 210L86.4 214L84.2 218L81.8 222L79.3 226L76.6 230L73.7 234L70.7 238L67.4 242L64 246L192 246L188.6 242L185.3 238L182.3 234L179.4 230L176.7 226L174.2 222L171.8 218L169.6 214L167.5 210L165.4 206L163.4 202L161 198L158.8 194L156.7 190L154.8 186L153 182L151.2 178L149.6 174L148.1 170L146.6 166L145.3 162L144.4 158L143.5 154L142.7 150L142 146L141.3 142L140.6 138L140 134L139.4 130L138.8 126L138.3 122L137.8 118L137.4 114L137 110L136.6 106L136.2 102L135.9 98L135.6 94L135.2 90L134.9 86L134.6 82L134.3 78L134 74L133.7 70L133.4 66L133.1 62L132.8 58L132.6 54L132.3 50L132.1 46L131.7 42L131.2 38L130.7 34L130.4 30L130 26L129.7 22L129.5 18ZM88 246L88.8 237.3L91 231.2L94.7 226L99.7 221.7L105.8 218.4L112.7 216L120.2 214.5L128 214L135.8 214.5L143.3 216L150.2 218.4L156.3 221.7L161.3 226L165 231.2L167.2 237.3L168 246Z"/><g fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"><path d="M126.5 18L126.3 22L126 26L125.6 30L125.3 34L124.8 38L124.3 42L123.9 46L123.7 50L123.4 54L123.2 58L122.9 62L122.6 66L122.3 70L122 74L121.7 78L121.4 82L121.1 86L120.8 90L120.4 94L120.1 98L119.8 102L119.4 106L119 110L118.6 114L118.2 118L117.7 122L117.2 126L116.6 130L116 134L115.4 138L114.7 142L114 146L113.3 150L112.5 154L111.6 158L110.7 162L109.4 166L107.9 170L106.4 174L104.8 178L103 182L101.2 186L99.3 190L97.2 194L95 198L92.6 202L90.6 206L88.5 210L86.4 214L84.2 218L81.8 222L79.3 226L76.6 230L73.7 234L70.7 238L67.4 242L64 246"/><path d="M129.5 18L129.7 22L130 26L130.4 30L130.7 34L131.2 38L131.7 42L132.1 46L132.3 50L132.6 54L132.8 58L133.1 62L133.4 66L133.7 70L134 74L134.3 78L134.6 82L134.9 86L135.2 90L135.6 94L135.9 98L136.2 102L136.6 106L137 110L137.4 114L137.8 118L138.3 122L138.8 126L139.4 130L140 134L140.6 138L141.3 142L142 146L142.7 150L143.5 154L144.4 158L145.3 162L146.6 166L148.1 170L149.6 174L151.2 178L153 182L154.8 186L156.7 190L158.8 194L161 198L163.4 202L165.4 206L167.5 210L169.6 214L171.8 218L174.2 222L176.7 226L179.4 230L182.3 234L185.3 238L188.6 242L192 246"/><path d="M88 246L88.8 237.3L91 231.2L94.7 226L99.7 221.7L105.8 218.4L112.7 216L120.2 214.5L128 214L135.8 214.5L143.3 216L150.2 218.4L156.3 221.7L161.3 226L165 231.2L167.2 237.3L168 246"/><path d="M54 246H202"/><path d="M128 18V6"/></g><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M95 246L95.6 239.5L97.5 234.9L100.6 231L104.7 227.8L109.7 225.3L115.4 223.5L121.6 222.4L128 222L134.4 222.4L140.6 223.5L146.3 225.3L151.3 227.8L155.4 231L158.5 234.9L160.4 239.5L161 246"/><path d="M89.6 208L112.7 216M128 208L85.3 216"/><path d="M166.4 208L143.3 216M128 208L170.7 216"/><path d="M85.3 216L94.7 224M112.7 216L80.6 224"/><path d="M170.7 216L161.3 224M143.3 216L175.4 224"/><path d="M80.6 224L91 232M94.7 224L75.2 232"/><path d="M175.4 224L165 232M161.3 224L180.8 232"/><path d="M75.2 232L88.8 240M91 232L69.1 240"/><path d="M180.8 232L167.2 240M165 232L186.9 240"/><path d="M69.1 240L168 246M88.8 240L64 246"/><path d="M186.9 240L88 246M167.2 240L192 246"/><path d="M95 198L156.7 190M161 198L99.3 190"/><path d="M99.3 190L146.6 166M156.7 190L109.4 166"/><path d="M112.1 156L141 140M143.9 156L115 140"/><path d="M115 140L137.8 118M141 140L118.2 118"/><path d="M118.2 118L135.9 98M137.8 118L120.1 98"/><path d="M120.1 98L134.5 80M135.9 98L121.5 80"/><path d="M121.5 80L133.1 62M134.5 80L122.9 62"/><path d="M122.9 62L132.2 48M133.1 62L123.8 48"/><path d="M123.8 48L130.2 28M132.2 48L125.8 28"/><path d="M99.3 190H156.7"/><path d="M115 140H141"/><path d="M118.2 118H137.8"/><path d="M120.1 98H135.9"/><path d="M121.5 80H134.5"/><path d="M122.9 62H133.1"/></g><rect x="80" y="197" width="96" height="12" rx="3" fill="currentColor"/><path d="M84 191V197M91.3 191V197M98.7 191V197M106 191V197M113.3 191V197M120.7 191V197M128 191V197M135.3 191V197M142.7 191V197M150 191V197M157.3 191V197M164.7 191V197M172 191V197M82 191H174" stroke="currentColor" stroke-width="2" fill="none"/><rect x="101" y="156" width="54" height="10" rx="3" fill="currentColor"/><path d="M105 150V156M108.8 150V156M112.7 150V156M116.5 150V156M120.3 150V156M124.2 150V156M128 150V156M131.8 150V156M135.7 150V156M139.5 150V156M143.3 150V156M147.2 150V156M151 150V156M103 150H153" stroke="currentColor" stroke-width="2" fill="none"/><rect x="116" y="40" width="24" height="8" rx="3" fill="currentColor"/><rect x="124" y="30" width="8" height="7" rx="1.5" fill="currentColor"/>',
  "bandera-mexico":'<rect x="8" y="66" width="240" height="137" rx="6" fill="currentColor" fill-opacity=".05"/><path d="M14 66H88V203H14Z" fill="currentColor" fill-opacity="0.34"/><path d="M168 66H242V203H168Z" fill="currentColor" fill-opacity="0.16"/><g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="66" width="240" height="137" rx="6"/><path d="M88 66V203M168 66V203" stroke-width="5"/></g><g transform="translate(128 132.5) scale(.93)"><path d="M2 47C24 46 37 31 35 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><g transform="translate(34 4) rotate(95)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.62" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(36 11) rotate(80)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(34 18) rotate(66)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(31 25) rotate(52)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.62" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(27 32) rotate(40)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(21 38) rotate(28)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(14 43) rotate(16)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.62" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(7 46) rotate(6)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(38 8) rotate(110)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(33 14) rotate(35)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.62" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(28 21) rotate(25)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(22 28) rotate(12)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><ellipse cx="37" cy="16" rx="1.9" ry="2.3" fill="currentColor" fill-opacity="0.9"/><ellipse cx="30" cy="30" rx="1.9" ry="2.3" fill="currentColor" fill-opacity="0.9"/><path d="M-2 47C-24 46 -37 31 -35 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><g transform="translate(-34 4) rotate(-95)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.62" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(-36 11) rotate(-80)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(-34 18) rotate(-66)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(-31 25) rotate(-52)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.62" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(-27 32) rotate(-40)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(-21 38) rotate(-28)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(-14 43) rotate(-16)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.62" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(-7 46) rotate(-6)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(-38 8) rotate(-110)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(-33 14) rotate(-35)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.62" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(-28 21) rotate(-25)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><g transform="translate(-22 28) rotate(-12)"><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -6.5Q3.8 -1 0 6.5Q-3.8 -1 0 -6.5Z" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round" /><path d="M0 -5.2V5.2" stroke="currentColor" stroke-width=".45" fill="none"/></g><ellipse cx="-37" cy="16" rx="1.9" ry="2.3" fill="currentColor" fill-opacity="0.9"/><ellipse cx="-30" cy="30" rx="1.9" ry="2.3" fill="currentColor" fill-opacity="0.9"/><path d="M0 46C-8 40-14 44-11 50C-7 52-3 49 0 48Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 46C-8 40-14 44-11 50C-7 52-3 49 0 48Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M0 46C8 40 14 44 11 50C7 52 3 49 0 48Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 46C8 40 14 44 11 50C7 52 3 49 0 48Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-2 48L-7 56L-3 55L0 50Z" fill="var(--bg,#000)" stroke="none" /><path d="M-2 48L-7 56L-3 55L0 50Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round" /><path d="M2 48L7 56L3 55L0 50Z" fill="var(--bg,#000)" stroke="none" /><path d="M2 48L7 56L3 55L0 50Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round" /><path d="M-24 41Q-12 38 0 41T24 41M-18 44.5Q-9 42.5 0 44.5T18 44.5" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".7"/><path d="M-14 40Q-10 31-2 31Q8 29 14 40Z" fill="var(--bg,#000)" stroke="none" /><path d="M-14 40Q-10 31-2 31Q8 29 14 40Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="0.7" stroke-linejoin="round" /><g transform="translate(-9 26) rotate(-28)"><path d="M0 -8.4A5.6 8.4 0 1 1 0.01 -8.4Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -8.4A5.6 8.4 0 1 1 0.01 -8.4Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.7" stroke-linejoin="round" /><circle cx="3.1" cy="0" r=".4"/><circle cx="2.2" cy="3.3" r=".4"/><circle cx="0" cy="4.6" r=".4"/><circle cx="-2.2" cy="3.3" r=".4"/><circle cx="-3.1" cy="0" r=".4"/><circle cx="-2.2" cy="-3.3" r=".4"/><circle cx="0" cy="-4.6" r=".4"/><circle cx="2.2" cy="-3.3" r=".4"/></g><g transform="translate(9 26) rotate(28)"><path d="M0 -8.4A5.6 8.4 0 1 1 0.01 -8.4Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -8.4A5.6 8.4 0 1 1 0.01 -8.4Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.7" stroke-linejoin="round" /><circle cx="3.1" cy="0" r=".4"/><circle cx="2.2" cy="3.3" r=".4"/><circle cx="0" cy="4.6" r=".4"/><circle cx="-2.2" cy="3.3" r=".4"/><circle cx="-3.1" cy="0" r=".4"/><circle cx="-2.2" cy="-3.3" r=".4"/><circle cx="0" cy="-4.6" r=".4"/><circle cx="2.2" cy="-3.3" r=".4"/></g><g transform="translate(0 22) rotate(0)"><path d="M0 -9A6 9 0 1 1 0.01 -9Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 -9A6 9 0 1 1 0.01 -9Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="0.7" stroke-linejoin="round" /><circle cx="3.3" cy="0" r=".4"/><circle cx="2.3" cy="3.5" r=".4"/><circle cx="0" cy="5" r=".4"/><circle cx="-2.3" cy="3.5" r=".4"/><circle cx="-3.3" cy="0" r=".4"/><circle cx="-2.3" cy="-3.5" r=".4"/><circle cx="0" cy="-5" r=".4"/><circle cx="2.3" cy="-3.5" r=".4"/></g><ellipse cx="-13" cy="19" rx="2.1" ry="2.8" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width=".5"/><ellipse cx="13" cy="20" rx="2.1" ry="2.8" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width=".5"/><ellipse cx="0" cy="13" rx="2.1" ry="2.8" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width=".5"/><path d="M9 6L24.5 17L29.5 18Z" fill="var(--bg,#000)" stroke="none" /><path d="M9 6L24.5 17L29.5 18Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M7 7L16.6 26L21.4 27Z" fill="var(--bg,#000)" stroke="none" /><path d="M7 7L16.6 26L21.4 27Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M5 9L7.8 28L12.2 29Z" fill="var(--bg,#000)" stroke="none" /><path d="M5 9L7.8 28L12.2 29Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><g transform="scale(1 1)"><path d="M-8 -15Q-5.1 -31.9 -11.4 -47.8Q-14.3 -30.9 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-5.1 -31.9 -11.4 -47.8Q-14.3 -30.9 -8 -15Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-11.4 -47.8" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-8.3 -33.4 -17.5 -49.4Q-17.2 -31 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-8.3 -33.4 -17.5 -49.4Q-17.2 -31 -8 -15Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-17.5 -49.4" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-11.9 -34.1 -24 -49.4Q-20.2 -30.3 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-11.9 -34.1 -24 -49.4Q-20.2 -30.3 -8 -15Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-24 -49.4" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-15.4 -33.9 -30.4 -47.5Q-23 -28.7 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-15.4 -33.9 -30.4 -47.5Q-23 -28.7 -8 -15Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-30.4 -47.5" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-18.6 -32.6 -35.8 -43.8Q-25.2 -26.2 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-18.6 -32.6 -35.8 -43.8Q-25.2 -26.2 -8 -15Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-35.8 -43.8" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-21.1 -30.4 -39.7 -38.5Q-26.6 -23 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-21.1 -30.4 -39.7 -38.5Q-26.6 -23 -8 -15Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-39.7 -38.5" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-22.8 -27.7 -41.8 -32.2Q-27 -19.5 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-22.8 -27.7 -41.8 -32.2Q-27 -19.5 -8 -15Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-41.8 -32.2" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-23.6 -24.8 -42 -25.7Q-26.4 -16 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-23.6 -24.8 -42 -25.7Q-26.4 -16 -8 -15Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-42 -25.7" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-23.7 -21.9 -40.7 -19.6Q-25 -12.7 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-23.7 -21.9 -40.7 -19.6Q-25 -12.7 -8 -15Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-40.7 -19.6" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-5.7 -25.2 -12 -33.6Q-14.3 -23.4 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-5.7 -25.2 -12 -33.6Q-14.3 -23.4 -8 -15Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-12 -33.6" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-8.1 -26.4 -16.2 -34.3Q-16.2 -22.9 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-8.1 -26.4 -16.2 -34.3Q-16.2 -22.9 -8 -15Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-16.2 -34.3" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-10.6 -26.8 -20.6 -33.6Q-17.9 -21.9 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-10.6 -26.8 -20.6 -33.6Q-17.9 -21.9 -8 -15Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-20.6 -33.6" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-13 -26.2 -24.3 -31.3Q-19.2 -20 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-13 -26.2 -24.3 -31.3Q-19.2 -20 -8 -15Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-24.3 -31.3" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-14.9 -24.9 -26.6 -27.6Q-19.8 -17.6 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-14.9 -24.9 -26.6 -27.6Q-19.8 -17.6 -8 -15Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-26.6 -27.6" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-15.9 -23.2 -27.3 -23.2Q-19.4 -15.1 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-15.9 -23.2 -27.3 -23.2Q-19.4 -15.1 -8 -15Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-27.3 -23.2" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-16.4 -21.3 -26.6 -19Q-18.2 -12.7 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-16.4 -21.3 -26.6 -19Q-18.2 -12.7 -8 -15Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-26.6 -19" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><ellipse cx="-17" cy="-17" rx="9" ry="6.4" transform="rotate(-40 -17 -17)" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width=".6"/></g><g transform="scale(-1 1)"><path d="M-8 -15Q-5.3 -33.2 -11.7 -50.4Q-14.4 -32.2 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-5.3 -33.2 -11.7 -50.4Q-14.4 -32.2 -8 -15Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-11.7 -50.4" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-8.7 -34.8 -18.3 -52.1Q-17.6 -32.3 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-8.7 -34.8 -18.3 -52.1Q-17.6 -32.3 -8 -15Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-18.3 -52.1" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-12.5 -35.5 -25.3 -52.1Q-20.8 -31.6 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-12.5 -35.5 -25.3 -52.1Q-20.8 -31.6 -8 -15Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-25.3 -52.1" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-16.3 -35.2 -32.1 -50.1Q-23.9 -30 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-16.3 -35.2 -32.1 -50.1Q-23.9 -30 -8 -15Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-32.1 -50.1" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-19.7 -33.7 -38 -46.1Q-26.3 -27.3 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-19.7 -33.7 -38 -46.1Q-26.3 -27.3 -8 -15Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-38 -46.1" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-22.4 -31.4 -42.3 -40.4Q-27.9 -24 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-22.4 -31.4 -42.3 -40.4Q-27.9 -24 -8 -15Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-42.3 -40.4" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-24.2 -28.4 -44.5 -33.6Q-28.3 -20.2 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-24.2 -28.4 -44.5 -33.6Q-28.3 -20.2 -8 -15Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-44.5 -33.6" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-25 -25.2 -44.7 -26.6Q-27.8 -16.4 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-25 -25.2 -44.7 -26.6Q-27.8 -16.4 -8 -15Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-44.7 -26.6" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-25 -22 -43.3 -20Q-26.3 -12.9 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-25 -22 -43.3 -20Q-26.3 -12.9 -8 -15Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-43.3 -20" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-5.8 -26 -12.3 -35.1Q-14.4 -24.1 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-5.8 -26 -12.3 -35.1Q-14.4 -24.1 -8 -15Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-12.3 -35.1" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-8.4 -27.2 -16.9 -35.9Q-16.5 -23.7 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-8.4 -27.2 -16.9 -35.9Q-16.5 -23.7 -8 -15Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-16.9 -35.9" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-11.1 -27.5 -21.6 -35.1Q-18.4 -22.6 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-11.1 -27.5 -21.6 -35.1Q-18.4 -22.6 -8 -15Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-21.6 -35.1" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-13.7 -26.9 -25.6 -32.6Q-19.9 -20.7 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-13.7 -26.9 -25.6 -32.6Q-19.9 -20.7 -8 -15Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-25.6 -32.6" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-15.6 -25.4 -28.1 -28.6Q-20.5 -18.1 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-15.6 -25.4 -28.1 -28.6Q-20.5 -18.1 -8 -15Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-28.1 -28.6" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-16.7 -23.5 -28.9 -23.9Q-20.2 -15.4 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-16.7 -23.5 -28.9 -23.9Q-20.2 -15.4 -8 -15Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-28.9 -23.9" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><path d="M-8 -15Q-17.1 -21.4 -28.1 -19.3Q-19 -12.8 -8 -15Z" fill="var(--bg,#000)" stroke="none" /><path d="M-8 -15Q-17.1 -21.4 -28.1 -19.3Q-19 -12.8 -8 -15Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><path d="M-8 -15L-28.1 -19.3" stroke="currentColor" stroke-width=".35" opacity=".6" fill="none"/><ellipse cx="-17" cy="-17" rx="9" ry="6.4" transform="rotate(-40 -17 -17)" fill="currentColor" fill-opacity="0.8" stroke="currentColor" stroke-width=".6"/></g><path d="M-12 -22C-19 -8-15 6-4 14L6 12C13 2 12-12 5-24C-1-29-8-27-12-22Z" fill="var(--bg,#000)" stroke="none" /><path d="M-12 -22C-19 -8-15 6-4 14L6 12C13 2 12-12 5-24C-1-29-8-27-12-22Z" fill="currentColor" fill-opacity="0.58" stroke="currentColor" stroke-width="0.9" stroke-linejoin="round" /><g fill="none" stroke="currentColor" stroke-width=".45"><path d="M-14.1 -15a2.1 2.1 0 0 0 4.2 0"/><path d="M-9.1 -15a2.1 2.1 0 0 0 4.2 0"/><path d="M-4.1 -15a2.1 2.1 0 0 0 4.2 0"/><path d="M0.9 -15a2.1 2.1 0 0 0 4.2 0"/><path d="M-11 -10.4a2.1 2.1 0 0 0 4.2 0"/><path d="M-6 -10.4a2.1 2.1 0 0 0 4.2 0"/><path d="M-1 -10.4a2.1 2.1 0 0 0 4.2 0"/><path d="M4 -10.4a2.1 2.1 0 0 0 4.2 0"/><path d="M-12.9 -5.8a2.1 2.1 0 0 0 4.2 0"/><path d="M-7.9 -5.8a2.1 2.1 0 0 0 4.2 0"/><path d="M-2.9 -5.8a2.1 2.1 0 0 0 4.2 0"/><path d="M2.1 -5.8a2.1 2.1 0 0 0 4.2 0"/><path d="M-9.8 -1.2a2.1 2.1 0 0 0 4.2 0"/><path d="M-4.8 -1.2a2.1 2.1 0 0 0 4.2 0"/><path d="M0.2 -1.2a2.1 2.1 0 0 0 4.2 0"/><path d="M5.2 -1.2a2.1 2.1 0 0 0 4.2 0"/><path d="M-11.7 3.4a2.1 2.1 0 0 0 4.2 0"/><path d="M-6.7 3.4a2.1 2.1 0 0 0 4.2 0"/><path d="M-1.7 3.4a2.1 2.1 0 0 0 4.2 0"/><path d="M-8.6 8a2.1 2.1 0 0 0 4.2 0"/><path d="M-3.6 8a2.1 2.1 0 0 0 4.2 0"/><path d="M1.4 8a2.1 2.1 0 0 0 4.2 0"/></g><path d="M-5 13L-7 21M3 13L5 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".85"/><path d="M-7 21L-10.4 24.2M-7 21L-7 24.2M-7 21L-3.6 24.2M5 21L1.6 24.2M5 21L5 24.2M5 21L8.4 24.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="none"/><path d="M-6 -33L-2 -40L-1 -33Z" fill="var(--bg,#000)" stroke="none" /><path d="M-6 -33L-2 -40L-1 -33Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round" /><circle cx="-9" cy="-28" r="6.3" fill="var(--bg,#000)"/><circle cx="-9" cy="-28" r="6.3" fill="currentColor" fill-opacity="0.45" stroke="currentColor" stroke-width=".9"/><path d="M-14.5 -31Q-25 -30-26 -23Q-22 -26-14.5 -23.5Z" fill="var(--bg,#000)" stroke="none" /><path d="M-14.5 -31Q-25 -30-26 -23Q-22 -26-14.5 -23.5Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round" /><circle cx="-11" cy="-29.4" r="1.5" fill="var(--bg,#000)" stroke="currentColor" stroke-width=".4"/><circle cx="-11" cy="-29.4" r=".7"/><path d="M-23 -24C-35 -20-22 -12-29 -5C-36 2-26 7-31 14C-33 18-25 20-18 20" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/><path d="M-23 -24C-35 -20-22 -12-29 -5C-36 2-26 7-31 14C-33 18-25 20-18 20" fill="none" stroke="var(--bg,#000)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray=".8 1.8"/></g>',
  "piramide":'<path d="M96.4 244L10 218.6L10 206.9L96.4 232.3Z" fill="var(--bg,#000)" stroke="none"/><path d="M96.4 244L10 218.6L10 206.9L96.4 232.3Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M96.4 244L246 229.3L246 217.7L96.4 232.3Z" fill="var(--bg,#000)" stroke="none"/><path d="M96.4 244L246 229.3L246 217.7L96.4 232.3Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M96.4 232.3L246 217.7L159.6 192.2L10 206.9Z" fill="var(--bg,#000)" stroke="none"/><path d="M96.4 232.3L246 217.7L159.6 192.2L10 206.9Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M98.4 231L17.7 207.3L17.7 195.6L98.4 219.4Z" fill="var(--bg,#000)" stroke="none"/><path d="M98.4 231L17.7 207.3L17.7 195.6L98.4 219.4Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M98.4 231L238.3 217.3L238.3 205.6L98.4 219.4Z" fill="var(--bg,#000)" stroke="none"/><path d="M98.4 231L238.3 217.3L238.3 205.6L98.4 219.4Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M98.4 219.4L238.3 205.6L157.6 181.9L17.7 195.6Z" fill="var(--bg,#000)" stroke="none"/><path d="M98.4 219.4L238.3 205.6L157.6 181.9L17.7 195.6Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M100.5 218.1L25.3 195.9L25.3 184.3L100.5 206.4Z" fill="var(--bg,#000)" stroke="none"/><path d="M100.5 218.1L25.3 195.9L25.3 184.3L100.5 206.4Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M100.5 218.1L230.7 205.3L230.7 193.6L100.5 206.4Z" fill="var(--bg,#000)" stroke="none"/><path d="M100.5 218.1L230.7 205.3L230.7 193.6L100.5 206.4Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M100.5 206.4L230.7 193.6L155.5 171.5L25.3 184.3Z" fill="var(--bg,#000)" stroke="none"/><path d="M100.5 206.4L230.7 193.6L155.5 171.5L25.3 184.3Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M102.5 205.1L33 184.6L33 173L102.5 193.4Z" fill="var(--bg,#000)" stroke="none"/><path d="M102.5 205.1L33 184.6L33 173L102.5 193.4Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M102.5 205.1L223 193.3L223 181.6L102.5 193.4Z" fill="var(--bg,#000)" stroke="none"/><path d="M102.5 205.1L223 193.3L223 181.6L102.5 193.4Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M102.5 193.4L223 181.6L153.5 161.1L33 173Z" fill="var(--bg,#000)" stroke="none"/><path d="M102.5 193.4L223 181.6L153.5 161.1L33 173Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M104.6 192.1L40.7 173.3L40.7 161.7L104.6 180.5Z" fill="var(--bg,#000)" stroke="none"/><path d="M104.6 192.1L40.7 173.3L40.7 161.7L104.6 180.5Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M104.6 192.1L215.3 181.3L215.3 169.6L104.6 180.5Z" fill="var(--bg,#000)" stroke="none"/><path d="M104.6 192.1L215.3 181.3L215.3 169.6L104.6 180.5Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M104.6 180.5L215.3 169.6L151.4 150.8L40.7 161.7Z" fill="var(--bg,#000)" stroke="none"/><path d="M104.6 180.5L215.3 169.6L151.4 150.8L40.7 161.7Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M106.7 179.2L48.4 162L48.4 150.3L106.7 167.5Z" fill="var(--bg,#000)" stroke="none"/><path d="M106.7 179.2L48.4 162L48.4 150.3L106.7 167.5Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M106.7 179.2L207.6 169.3L207.6 157.6L106.7 167.5Z" fill="var(--bg,#000)" stroke="none"/><path d="M106.7 179.2L207.6 169.3L207.6 157.6L106.7 167.5Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M106.7 167.5L207.6 157.6L149.3 140.4L48.4 150.3Z" fill="var(--bg,#000)" stroke="none"/><path d="M106.7 167.5L207.6 157.6L149.3 140.4L48.4 150.3Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M108.7 166.2L56 150.7L56 139L108.7 154.5Z" fill="var(--bg,#000)" stroke="none"/><path d="M108.7 166.2L56 150.7L56 139L108.7 154.5Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M108.7 166.2L200 157.2L200 145.6L108.7 154.5Z" fill="var(--bg,#000)" stroke="none"/><path d="M108.7 166.2L200 157.2L200 145.6L108.7 154.5Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M108.7 154.5L200 145.6L147.3 130.1L56 139Z" fill="var(--bg,#000)" stroke="none"/><path d="M108.7 154.5L200 145.6L147.3 130.1L56 139Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M110.8 153.2L63.7 139.4L63.7 127.7L110.8 141.6Z" fill="var(--bg,#000)" stroke="none"/><path d="M110.8 153.2L63.7 139.4L63.7 127.7L110.8 141.6Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M110.8 153.2L192.3 145.2L192.3 133.6L110.8 141.6Z" fill="var(--bg,#000)" stroke="none"/><path d="M110.8 153.2L192.3 145.2L192.3 133.6L110.8 141.6Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M110.8 141.6L192.3 133.6L145.2 119.7L63.7 127.7Z" fill="var(--bg,#000)" stroke="none"/><path d="M110.8 141.6L192.3 133.6L145.2 119.7L63.7 127.7Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M112.8 140.3L71.4 128.1L71.4 116.4L112.8 128.6Z" fill="var(--bg,#000)" stroke="none"/><path d="M112.8 140.3L71.4 128.1L71.4 116.4L112.8 128.6Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M112.8 140.3L184.6 133.2L184.6 121.6L112.8 128.6Z" fill="var(--bg,#000)" stroke="none"/><path d="M112.8 140.3L184.6 133.2L184.6 121.6L112.8 128.6Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M112.8 128.6L184.6 121.6L143.2 109.4L71.4 116.4Z" fill="var(--bg,#000)" stroke="none"/><path d="M112.8 128.6L184.6 121.6L143.2 109.4L71.4 116.4Z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M160 237.8L182.4 235.6L157.7 124.2L139.8 126Z" fill="var(--bg,#000)" stroke="none"/><path d="M160 237.8L182.4 235.6L157.7 124.2L139.8 126Z" fill="currentColor" fill-opacity="0.34" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><g fill="none" stroke="currentColor" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"><path d="M159.1 233.1L181.4 230.9"/><path d="M158.3 228.4L180.4 226.3"/><path d="M157.4 223.8L179.3 221.6"/><path d="M156.6 219.1L178.3 217"/><path d="M155.8 214.5L177.3 212.4"/><path d="M154.9 209.8L176.2 207.7"/><path d="M154.1 205.2L175.2 203.1"/><path d="M153.2 200.5L174.2 198.4"/><path d="M152.4 195.8L173.1 193.8"/><path d="M151.5 191.2L172.1 189.2"/><path d="M150.7 186.5L171.1 184.5"/><path d="M149.9 181.9L170.1 179.9"/><path d="M149 177.2L169 175.2"/><path d="M148.2 172.5L168 170.6"/><path d="M147.3 167.9L167 166"/><path d="M146.5 163.2L165.9 161.3"/><path d="M145.7 158.6L164.9 156.7"/><path d="M144.8 153.9L163.9 152"/><path d="M144 149.3L162.9 147.4"/><path d="M143.1 144.6L161.8 142.8"/><path d="M142.3 139.9L160.8 138.1"/><path d="M141.4 135.3L159.8 133.5"/><path d="M140.6 130.6L158.7 128.8"/></g><path d="M117.2 124.3L95.7 117.9L95.7 94.6L117.2 101Z" fill="var(--bg,#000)" stroke="none"/><path d="M117.2 124.3L95.7 117.9L95.7 94.6L117.2 101Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M117.2 124.3L160.3 120L160.3 96.7L117.2 101Z" fill="var(--bg,#000)" stroke="none"/><path d="M117.2 124.3L160.3 120L160.3 96.7L117.2 101Z" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M116.3 101.6L163.9 96.9L139.7 89.8L92.1 94.4Z" fill="var(--bg,#000)" stroke="none"/><path d="M116.3 101.6L163.9 96.9L139.7 89.8L92.1 94.4Z" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M131 122.9L131 108.5L146.5 106.9L146.5 121.4Z" fill="currentColor" fill-opacity="0.75" stroke="currentColor" stroke-width="2.6"/>',
  "tulipanes":'<ellipse cx="128" cy="238" rx="92" ry="7" fill="currentColor" fill-opacity="0.16"/><path d="M128 84C128 144 128 176 128 236" fill="none" stroke="currentColor" stroke-width="8.5" stroke-linecap="round" opacity=".9"/><path d="M70 128C70 188 90 176 90 236" fill="none" stroke="currentColor" stroke-width="8.5" stroke-linecap="round" opacity=".9"/><path d="M186 122C186 182 166 176 166 236" fill="none" stroke="currentColor" stroke-width="8.5" stroke-linecap="round" opacity=".9"/><path d="M128 236C86 226 52 190 44 132C70 150 108 186 128 236Z" fill="var(--bg,#000)" stroke="none" /><path d="M128 236C86 226 52 190 44 132C70 150 108 186 128 236Z" fill="currentColor" fill-opacity="0.4" stroke="currentColor" stroke-width="3.4" stroke-linejoin="round" /><path d="M128 236C170 228 204 196 212 142C186 158 148 190 128 236Z" fill="var(--bg,#000)" stroke="none" /><path d="M128 236C170 228 204 196 212 142C186 158 148 190 128 236Z" fill="currentColor" fill-opacity="0.26" stroke="currentColor" stroke-width="3.4" stroke-linejoin="round" /><path d="M126 228C98 204 72 172 56 146M130 228C160 206 186 176 200 152" fill="none" stroke="currentColor" stroke-width="2" opacity=".55" stroke-linecap="round"/><g transform="translate(70 128) rotate(-10) scale(1.0)"><path d="M0 4C-20 2-28-22-22-54C-14-44-8-36-4-24C-2-14-1-4 0 4Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 4C-20 2-28-22-22-54C-14-44-8-36-4-24C-2-14-1-4 0 4Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" /><path d="M0 4C20 2 28-22 22-54C14-44 8-36 4-24C2-14 1-4 0 4Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 4C20 2 28-22 22-54C14-44 8-36 4-24C2-14 1-4 0 4Z" fill="currentColor" fill-opacity="0.34" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" /><path d="M0 6C-14-2-17-30 0-64C17-30 14-2 0 6Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 6C-14-2-17-30 0-64C17-30 14-2 0 6Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" /><path d="M-3-52C-8-36-9-18-4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/><path d="M-17-22C-12-30-8-34-6-40M17-22C12-30 8-34 6-40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/></g><g transform="translate(186 122) rotate(10) scale(1.0)"><path d="M0 4C-20 2-28-22-22-54C-14-44-8-36-4-24C-2-14-1-4 0 4Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 4C-20 2-28-22-22-54C-14-44-8-36-4-24C-2-14-1-4 0 4Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" /><path d="M0 4C20 2 28-22 22-54C14-44 8-36 4-24C2-14 1-4 0 4Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 4C20 2 28-22 22-54C14-44 8-36 4-24C2-14 1-4 0 4Z" fill="currentColor" fill-opacity="0.34" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" /><path d="M0 6C-14-2-17-30 0-64C17-30 14-2 0 6Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 6C-14-2-17-30 0-64C17-30 14-2 0 6Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" /><path d="M-3-52C-8-36-9-18-4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/><path d="M-17-22C-12-30-8-34-6-40M17-22C12-30 8-34 6-40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/></g><g transform="translate(128 84) rotate(0) scale(1.28)"><path d="M0 4C-20 2-28-22-22-54C-14-44-8-36-4-24C-2-14-1-4 0 4Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 4C-20 2-28-22-22-54C-14-44-8-36-4-24C-2-14-1-4 0 4Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" /><path d="M0 4C20 2 28-22 22-54C14-44 8-36 4-24C2-14 1-4 0 4Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 4C20 2 28-22 22-54C14-44 8-36 4-24C2-14 1-4 0 4Z" fill="currentColor" fill-opacity="0.34" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" /><path d="M0 6C-14-2-17-30 0-64C17-30 14-2 0 6Z" fill="var(--bg,#000)" stroke="none" /><path d="M0 6C-14-2-17-30 0-64C17-30 14-2 0 6Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" /><path d="M-3-52C-8-36-9-18-4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/><path d="M-17-22C-12-30-8-34-6-40M17-22C12-30 8-34 6-40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/></g>',
  "atomium":'<ellipse cx="128" cy="246" rx="86" ry="6" fill="currentColor" fill-opacity="0.18"/><path d="M48 194.8L30 246" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M48 194.8L30 246" fill="none" stroke="var(--bg,#000)" stroke-width="3.6" stroke-linecap="round"/><path d="M208 194.8L226 246" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M208 194.8L226 246" fill="none" stroke="var(--bg,#000)" stroke-width="3.6" stroke-linecap="round"/><path d="M128 240.8L128 246" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M128 240.8L128 246" fill="none" stroke="var(--bg,#000)" stroke-width="3.6" stroke-linecap="round"/><path d="M128 112.8L128 59.2" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M128 112.8L128 59.2" fill="none" stroke="var(--bg,#000)" stroke-width="4" stroke-linecap="round"/><path d="M128 112.8L128 59.2" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><path d="M111.4 122.4L64.6 95.6" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M111.4 122.4L64.6 95.6" fill="none" stroke="var(--bg,#000)" stroke-width="4" stroke-linecap="round"/><path d="M111.4 122.4L64.6 95.6" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><path d="M144.6 122.4L191.4 95.6" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M144.6 122.4L191.4 95.6" fill="none" stroke="var(--bg,#000)" stroke-width="4" stroke-linecap="round"/><path d="M144.6 122.4L191.4 95.6" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><path d="M111.4 141.6L64.6 168.4" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M111.4 141.6L64.6 168.4" fill="none" stroke="var(--bg,#000)" stroke-width="4" stroke-linecap="round"/><path d="M111.4 141.6L64.6 168.4" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><path d="M144.6 141.6L191.4 168.4" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M144.6 141.6L191.4 168.4" fill="none" stroke="var(--bg,#000)" stroke-width="4" stroke-linecap="round"/><path d="M144.6 141.6L191.4 168.4" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><path d="M128 151.2L128 204.8" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M128 151.2L128 204.8" fill="none" stroke="var(--bg,#000)" stroke-width="4" stroke-linecap="round"/><path d="M128 151.2L128 204.8" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><path d="M64.6 76.4L111.4 49.6" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M64.6 76.4L111.4 49.6" fill="none" stroke="var(--bg,#000)" stroke-width="4" stroke-linecap="round"/><path d="M64.6 76.4L111.4 49.6" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><path d="M191.4 76.4L144.6 49.6" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M191.4 76.4L144.6 49.6" fill="none" stroke="var(--bg,#000)" stroke-width="4" stroke-linecap="round"/><path d="M191.4 76.4L144.6 49.6" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><path d="M48 105.2L48 158.8" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M48 105.2L48 158.8" fill="none" stroke="var(--bg,#000)" stroke-width="4" stroke-linecap="round"/><path d="M48 105.2L48 158.8" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><path d="M208 105.2L208 158.8" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M208 105.2L208 158.8" fill="none" stroke="var(--bg,#000)" stroke-width="4" stroke-linecap="round"/><path d="M208 105.2L208 158.8" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><path d="M64.6 187.6L111.4 214.4" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M64.6 187.6L111.4 214.4" fill="none" stroke="var(--bg,#000)" stroke-width="4" stroke-linecap="round"/><path d="M64.6 187.6L111.4 214.4" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><path d="M191.4 187.6L144.6 214.4" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M191.4 187.6L144.6 214.4" fill="none" stroke="var(--bg,#000)" stroke-width="4" stroke-linecap="round"/><path d="M191.4 187.6L144.6 214.4" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><circle cx="128" cy="40" r="24" fill="var(--bg,#000)"/><circle cx="128" cy="40" r="24" fill="currentColor" fill-opacity="0.2"/><path d="M149.1 28.5A24 24 0 0 1 116.5 61.1A37.2 37.2 0 0 0 149.1 28.5Z" fill="currentColor" fill-opacity="0.36"/><circle cx="128" cy="40" r="24" fill="none" stroke="currentColor" stroke-width="4.6"/><path d="M113.6 37.6a15.6 15.6 0 0 1 12.5 -12.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".8"/><circle cx="48" cy="86" r="24" fill="var(--bg,#000)"/><circle cx="48" cy="86" r="24" fill="currentColor" fill-opacity="0.2"/><path d="M69.1 74.5A24 24 0 0 1 36.5 107.1A37.2 37.2 0 0 0 69.1 74.5Z" fill="currentColor" fill-opacity="0.36"/><circle cx="48" cy="86" r="24" fill="none" stroke="currentColor" stroke-width="4.6"/><path d="M33.6 83.6a15.6 15.6 0 0 1 12.5 -12.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".8"/><circle cx="208" cy="86" r="24" fill="var(--bg,#000)"/><circle cx="208" cy="86" r="24" fill="currentColor" fill-opacity="0.2"/><path d="M229.1 74.5A24 24 0 0 1 196.5 107.1A37.2 37.2 0 0 0 229.1 74.5Z" fill="currentColor" fill-opacity="0.36"/><circle cx="208" cy="86" r="24" fill="none" stroke="currentColor" stroke-width="4.6"/><path d="M193.6 83.6a15.6 15.6 0 0 1 12.5 -12.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".8"/><circle cx="128" cy="132" r="24" fill="var(--bg,#000)"/><circle cx="128" cy="132" r="24" fill="currentColor" fill-opacity="0.2"/><path d="M149.1 120.5A24 24 0 0 1 116.5 153.1A37.2 37.2 0 0 0 149.1 120.5Z" fill="currentColor" fill-opacity="0.36"/><circle cx="128" cy="132" r="24" fill="none" stroke="currentColor" stroke-width="4.6"/><path d="M113.6 129.6a15.6 15.6 0 0 1 12.5 -12.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".8"/><circle cx="48" cy="178" r="24" fill="var(--bg,#000)"/><circle cx="48" cy="178" r="24" fill="currentColor" fill-opacity="0.2"/><path d="M69.1 166.5A24 24 0 0 1 36.5 199.1A37.2 37.2 0 0 0 69.1 166.5Z" fill="currentColor" fill-opacity="0.36"/><circle cx="48" cy="178" r="24" fill="none" stroke="currentColor" stroke-width="4.6"/><path d="M33.6 175.6a15.6 15.6 0 0 1 12.5 -12.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".8"/><circle cx="208" cy="178" r="24" fill="var(--bg,#000)"/><circle cx="208" cy="178" r="24" fill="currentColor" fill-opacity="0.2"/><path d="M229.1 166.5A24 24 0 0 1 196.5 199.1A37.2 37.2 0 0 0 229.1 166.5Z" fill="currentColor" fill-opacity="0.36"/><circle cx="208" cy="178" r="24" fill="none" stroke="currentColor" stroke-width="4.6"/><path d="M193.6 175.6a15.6 15.6 0 0 1 12.5 -12.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".8"/><circle cx="128" cy="224" r="24" fill="var(--bg,#000)"/><circle cx="128" cy="224" r="24" fill="currentColor" fill-opacity="0.2"/><path d="M149.1 212.5A24 24 0 0 1 116.5 245.1A37.2 37.2 0 0 0 149.1 212.5Z" fill="currentColor" fill-opacity="0.36"/><circle cx="128" cy="224" r="24" fill="none" stroke="currentColor" stroke-width="4.6"/><path d="M113.6 221.6a15.6 15.6 0 0 1 12.5 -12.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".8"/>',
  "coliseo":'<path d="M5.6 222.6L26.2 227.6L55.4 231.4L90.8 233.8L129.3 234.6L167.7 233.7L202.7 231.2L231.4 227.3L251.4 222.3L251.4 222.9L251.4 223.5L251.4 224.2L251.4 224.8L251.4 225.4L251.4 226L251.4 226.7L251.4 227.3L231.4 232.3L202.7 236.2L167.7 238.7L129.3 239.6L90.8 238.8L55.4 236.4L26.2 232.6L5.6 227.6L5.6 227L5.6 226.4L5.6 225.8L5.6 225.1L5.6 224.5L5.6 223.9L5.6 223.3Z" fill="var(--bg,#000)"/><path d="M5.6 222.6L26.2 227.6L55.4 231.4L90.8 233.8L129.3 234.6L167.7 233.7L202.7 231.2L231.4 227.3L251.4 222.3L251.4 222.9L251.4 223.5L251.4 224.2L251.4 224.8L251.4 225.4L251.4 226L251.4 226.7L251.4 227.3L231.4 232.3L202.7 236.2L167.7 238.7L129.3 239.6L90.8 238.8L55.4 236.4L26.2 232.6L5.6 227.6L5.6 227L5.6 226.4L5.6 225.8L5.6 225.1L5.6 224.5L5.6 223.9L5.6 223.3Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><path d="M8.8 228.7L30 233.2L58.6 236.7L92.6 238.9L129.3 239.6L165.8 238.8L199.5 236.5L227.7 232.9L248.3 228.3L248.3 228.8L248.3 229.3L248.3 229.8L248.3 230.3L248.3 230.8L248.3 231.3L248.3 231.8L248.3 232.3L227.7 236.9L199.5 240.5L165.8 242.8L129.3 243.6L92.6 242.9L58.6 240.7L30 237.2L8.8 232.7L8.8 232.2L8.8 231.7L8.8 231.2L8.8 230.7L8.8 230.2L8.8 229.7L8.8 229.2Z" fill="var(--bg,#000)"/><path d="M8.8 228.7L30 233.2L58.6 236.7L92.6 238.9L129.3 239.6L165.8 238.8L199.5 236.5L227.7 232.9L248.3 228.3L248.3 228.8L248.3 229.3L248.3 229.8L248.3 230.3L248.3 230.8L248.3 231.3L248.3 231.8L248.3 232.3L227.7 236.9L199.5 240.5L165.8 242.8L129.3 243.6L92.6 242.9L58.6 240.7L30 237.2L8.8 232.7L8.8 232.2L8.8 231.7L8.8 231.2L8.8 230.7L8.8 230.2L8.8 229.7L8.8 229.2Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><path d="M135.6 108.6L138.1 107.8L140.7 107L143.2 106.2L145.7 105.4L148.2 104.6L150.7 103.8L153.2 103L155.7 102.2L159.7 102.5L163.7 102.9L167.7 103.2L171.6 103.5L175.5 103.8L179.3 104.1L183.1 104.3L186.8 104.6L189.9 105.3L193 106.1L196 106.8L199 107.6L201.9 108.3L204.8 109L207.6 109.7L210.4 110.4L213.1 111.3L215.8 112.2L218.4 113.1L220.9 114L223.4 114.9L225.8 115.7L228.2 116.6L230.4 117.5L232.6 119.3L234.8 121.1L236.8 123L238.8 124.8L240.7 126.6L242.6 128.4L244.3 130.2L246 132L246 143.5L246 155L246 166.5L246 178L246 189.5L246 201L246 212.5L246 224L237 226.2L226.2 228.2L213.9 229.9L200.1 231.5L185.1 232.7L169.2 233.6L152.6 234.3L135.6 234.6L135.6 218.8L135.6 203.1L135.6 187.3L135.6 171.6L135.6 155.8L135.6 140.1L135.6 124.3Z" fill="var(--c-int,#777)"/><g stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M190.8 153.3L190.8 144L190.8 134.8L191 133.7L191.2 132.6L191.9 131.7L192.6 130.7L193.5 130.1L194.5 129.4L195.7 129.1L196.8 128.8L198 128.9L199.1 129L200.1 129.5L201 130L201.6 130.8L202.3 131.6L202.5 132.7L202.7 133.7L202.7 142.9L202.7 152.2L196.8 152.8L190.8 153.3L190.8 153.3Z" fill="var(--c-hueco,#222)"/><path d="M214.6 150.8L214.6 141.6L214.6 132.3L214.8 131.3L215 130.2L215.6 129.2L216.2 128.3L217 127.5L217.9 126.8L218.9 126.5L219.8 126.1L220.8 126.2L221.7 126.3L222.5 126.8L223.3 127.2L223.9 128L224.4 128.9L224.6 129.9L224.8 130.9L224.8 140.2L224.8 149.4L219.8 150.1L214.6 150.8L214.6 150.8Z" fill="var(--c-hueco,#222)"/><path d="M234.5 185.7L234.5 175.5L234.5 165.2L234.6 164.1L234.8 163L235.2 162L235.7 161.1L236.4 160.3L237 159.6L237.8 159.2L238.5 158.9L239.3 158.9L240 158.9L240.6 159.4L241.2 159.8L241.6 160.6L242 161.4L242.2 162.5L242.3 163.5L242.3 173.7L242.3 184L238.5 184.9L234.5 185.7L234.5 185.7Z" fill="var(--c-hueco,#222)"/><path d="M234.5 223.7L234.5 213.5L234.5 203.2L234.6 202.1L234.8 201L235.2 200L235.7 199.1L236.4 198.3L237 197.6L237.8 197.2L238.5 196.9L239.3 196.9L240 196.9L240.6 197.4L241.2 197.8L241.6 198.6L242 199.4L242.2 200.5L242.3 201.5L242.3 211.7L242.3 222L238.5 222.9L234.5 223.7L234.5 223.7Z" fill="var(--c-hueco,#222)"/></g><path d="M135.6 108.6L138.1 107.8L140.7 107L143.2 106.2L145.7 105.4L148.2 104.6L150.7 103.8L153.2 103L155.7 102.2L159.7 102.5L163.7 102.9L167.7 103.2L171.6 103.5L175.5 103.8L179.3 104.1L183.1 104.3L186.8 104.6L189.9 105.3L193 106.1L196 106.8L199 107.6L201.9 108.3L204.8 109L207.6 109.7L210.4 110.4L213.1 111.3L215.8 112.2L218.4 113.1L220.9 114L223.4 114.9L225.8 115.7L228.2 116.6L230.4 117.5L232.6 119.3L234.8 121.1L236.8 123L238.8 124.8L240.7 126.6L242.6 128.4L244.3 130.2L246 132L246 143.5L246 155L246 166.5L246 178L246 189.5L246 201L246 212.5L246 224" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M10 84L19.4 86.3L30.6 88.3L43.6 90.1L58.1 91.7L73.8 92.9L90.5 93.8L107.8 94.4L125.5 94.6L127 98.1L128.6 101.6L130.2 105.1L131.8 108.6L133.4 112.1L135 115.6L136.6 119.1L138.1 122.6L142.9 122.5L147.6 122.4L152.3 122.3L156.9 122.1L161.6 122L166.2 121.8L170.7 121.6L175.2 121.3L175.2 123.1L175.2 124.8L175.2 126.6L175.2 128.3L175.2 130.1L175.2 131.8L175.2 133.6L175.2 135.3L176.9 135.2L178.7 135.1L180.5 135L182.2 134.9L183.9 134.8L185.7 134.7L187.4 134.5L189.1 134.4L189.1 137.2L189.1 139.9L189.1 142.7L189.1 145.4L189.1 148.2L189.1 150.9L189.1 153.7L189.1 156.4L191.3 156.2L193.5 156L195.7 155.9L197.9 155.7L200.1 155.5L202.2 155.2L204.3 155L206.4 154.8L206.4 157.1L206.4 159.3L206.4 161.6L206.4 163.8L206.4 166.1L206.4 168.3L206.4 170.6L206.4 172.8L207.6 172.7L208.9 172.5L210.2 172.4L211.4 172.2L212.6 172.1L213.9 171.9L215.1 171.8L216.3 171.6L216.3 174.1L216.3 176.6L216.3 179.1L216.3 181.6L216.3 184.1L216.3 186.6L216.3 189.1L216.3 191.6L217.2 191.5L218.2 191.4L219.1 191.2L220 191.1L220.9 191L221.8 190.9L222.7 190.7L223.6 190.6L223.6 195.3L223.6 200.1L223.6 204.8L223.6 209.6L223.6 214.3L223.6 219.1L223.6 223.8L223.6 228.6L199.3 231.5L171 233.5L140.4 234.5L109 234.4L78.8 233.2L51.2 231L27.8 227.9L10 224L10 206.5L10 189L10 171.5L10 154L10 136.5L10 119L10 101.5Z" fill="var(--c-muro,#bbb)"/><g fill="none" stroke="currentColor" stroke-linecap="round"><path d="M10 186L15 187.3L20.7 188.5L27 189.7L33.8 190.8L41.2 191.8L49 192.7L57.3 193.6L66 194.3L75 195L84.4 195.5L93.9 196L103.7 196.3L113.6 196.5L123.6 196.6L133.6 196.6L143.6 196.5L153.5 196.2L163.3 195.9L172.8 195.5L182.1 194.9L191.1 194.2L199.8 193.5L208 192.6L215.8 191.7" stroke-width="3.4"/><path d="M10 148L14.3 149.1L19.1 150.2L24.3 151.2L30 152.2L36 153.1L42.5 154L49.3 154.8L56.5 155.5L63.9 156.2L71.6 156.7L79.6 157.3L87.7 157.7L96 158L104.5 158.3L113 158.5L121.7 158.6L130.3 158.6L138.9 158.5L147.5 158.4L156 158.2L164.4 157.9L172.6 157.5L180.7 157L188.5 156.4" stroke-width="3.4"/><path d="M10 112L13.1 112.8L16.5 113.6L20.2 114.4L24.1 115.2L28.2 115.9L32.6 116.6L37.2 117.3L42 117.9L47 118.5L52.1 119.1L57.5 119.6L63 120.1L68.7 120.5L74.5 120.9L80.4 121.3L86.4 121.6L92.5 121.9L98.7 122.1L105 122.3L111.3 122.5L117.7 122.6L124.1 122.6L130.5 122.6L136.9 122.6" stroke-width="3.8"/></g><g stroke="currentColor" stroke-linejoin="round"><path d="M24.8 224.3L25.8 224.5L26.7 224.7L27.6 224.8L27.6 214.2L27.6 203.5L27.6 192.8L26.7 192.7L25.8 192.5L24.8 192.3L24.8 203L24.8 213.7Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M23.6 192.1L25.4 192.4L27.1 192.7L28.9 193L28.9 192L28.9 191L28.9 190L27.1 189.7L25.4 189.4L23.6 189.1L23.6 190.1L23.6 191.1Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M45.5 227.3L46.6 227.5L47.8 227.6L48.9 227.7L48.9 217.1L48.9 206.4L48.9 195.7L47.8 195.6L46.6 195.5L45.5 195.3L45.5 206L45.5 216.7Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M44 195.2L46.1 195.4L48.3 195.7L50.5 195.9L50.5 194.9L50.5 193.9L50.5 192.9L48.3 192.7L46.1 192.4L44 192.2L44 193.2L44 194.2Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M70 229.6L71.3 229.7L72.6 229.8L73.9 229.9L73.9 219.2L73.9 208.6L73.9 197.9L72.6 197.8L71.3 197.7L70 197.6L70 208.3L70 219Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M68.3 197.5L70.7 197.7L73.2 197.9L75.7 198L75.7 197L75.7 196L75.7 195L73.2 194.9L70.7 194.7L68.3 194.5L68.3 195.5L68.3 196.5Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M97.2 231.1L98.6 231.1L100 231.2L101.4 231.2L101.4 220.5L101.4 209.9L101.4 199.2L100 199.2L98.6 199.1L97.2 199.1L97.2 209.7L97.2 220.4Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M95.4 199L98 199.1L100.6 199.2L103.3 199.3L103.3 198.3L103.3 197.3L103.3 196.3L100.6 196.2L98 196.1L95.4 196L95.4 197L95.4 198Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M125.8 231.6L127.3 231.6L128.7 231.6L130.2 231.6L130.2 220.9L130.2 210.3L130.2 199.6L128.7 199.6L127.3 199.6L125.8 199.6L125.8 210.3L125.8 220.9Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M123.9 199.6L126.6 199.6L129.4 199.6L132.1 199.6L132.1 198.6L132.1 197.6L132.1 196.6L129.4 196.6L126.6 196.6L123.9 196.6L123.9 197.6L123.9 198.6Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M154.6 231.2L156 231.2L157.4 231.1L158.8 231.1L158.8 220.4L158.8 209.7L158.8 199.1L157.4 199.1L156 199.2L154.6 199.2L154.6 209.9L154.6 220.5Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M152.7 199.3L155.4 199.2L158 199.1L160.6 199L160.6 198L160.6 197L160.6 196L158 196.1L155.4 196.2L152.7 196.3L152.7 197.3L152.7 198.3Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M182.1 229.9L183.4 229.8L184.7 229.7L186 229.6L186 219L186 208.3L186 197.6L184.7 197.7L183.4 197.8L182.1 197.9L182.1 208.6L182.1 219.2Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M180.3 198L182.8 197.9L185.3 197.7L187.7 197.5L187.7 196.5L187.7 195.5L187.7 194.5L185.3 194.7L182.8 194.9L180.3 195L180.3 196L180.3 197Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M207.1 227.7L208.2 227.6L209.4 227.5L210.5 227.3L210.5 216.7L210.5 206L210.5 195.3L209.4 195.5L208.2 195.6L207.1 195.7L207.1 206.4L207.1 217.1Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M205.5 195.9L207.7 195.7L209.9 195.4L212 195.2L212 194.2L212 193.2L212 192.2L209.9 192.4L207.7 192.7L205.5 192.9L205.5 193.9L205.5 194.9Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M13.2 221.9L13.2 213L13.2 204.1L13.4 202.9L13.5 201.8L14 200.9L14.4 200L15.1 199.5L15.8 198.9L16.6 198.9L17.5 198.9L18.3 199.3L19.2 199.7L20 200.5L20.7 201.4L21.2 202.5L21.7 203.6L21.9 204.8L22.1 206.1L22.1 214.9L22.1 223.8L17.5 222.9L13.2 221.9L13.2 221.9Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M30.6 225.3L30.6 216.4L30.6 207.6L30.8 206.4L31 205.2L31.6 204.3L32.2 203.4L33.1 202.8L34 202.3L35.1 202.2L36.2 202.1L37.3 202.5L38.4 202.9L39.4 203.7L40.3 204.5L41 205.6L41.6 206.7L41.9 208L42.1 209.2L42.1 218.1L42.1 226.9L36.2 226.1L30.6 225.3L30.6 225.3Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M52.5 228.1L52.5 219.2L52.5 210.4L52.7 209.2L53 208L53.7 207.1L54.4 206.1L55.5 205.6L56.6 205L57.9 204.9L59.2 204.8L60.5 205.1L61.8 205.5L62.9 206.2L64 207L64.8 208.1L65.5 209.2L65.8 210.4L66.1 211.6L66.1 220.5L66.1 229.3L59.2 228.8L52.5 228.1L52.5 228.1Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M77.9 230.2L77.9 221.3L77.9 212.4L78.2 211.2L78.5 210L79.3 209.1L80.1 208.1L81.3 207.5L82.5 206.9L83.9 206.7L85.4 206.6L86.8 206.9L88.3 207.2L89.5 207.9L90.7 208.6L91.5 209.7L92.4 210.7L92.7 212L93 213.2L93 222L93 230.9L85.4 230.6L77.9 230.2L77.9 230.2Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M105.7 231.3L105.7 222.5L105.7 213.6L106 212.4L106.3 211.2L107.2 210.2L108 209.2L109.3 208.6L110.6 207.9L112.1 207.7L113.6 207.5L115.1 207.8L116.6 208L117.9 208.7L119.2 209.4L120 210.4L120.9 211.4L121.2 212.6L121.5 213.8L121.5 222.7L121.5 231.6L113.6 231.5L105.7 231.3L105.7 231.3Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M134.5 231.6L134.5 222.7L134.5 213.8L134.8 212.6L135.1 211.4L136 210.4L136.8 209.4L138.1 208.7L139.4 208L140.9 207.8L142.4 207.5L143.9 207.7L145.4 207.9L146.7 208.6L148 209.2L148.8 210.2L149.7 211.2L150 212.4L150.3 213.6L150.3 222.5L150.3 231.3L142.4 231.5L134.5 231.6L134.5 231.6Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M163 230.9L163 222L163 213.2L163.3 212L163.6 210.7L164.5 209.7L165.3 208.6L166.5 207.9L167.7 207.2L169.2 206.9L170.6 206.6L172.1 206.7L173.5 206.9L174.7 207.5L175.9 208.1L176.7 209.1L177.5 210L177.8 211.2L178.1 212.4L178.1 221.3L178.1 230.2L170.6 230.6L163 230.9L163 230.9Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M189.9 229.3L189.9 220.5L189.9 211.6L190.2 210.4L190.5 209.2L191.2 208.1L192 207L193.1 206.2L194.2 205.5L195.5 205.1L196.8 204.8L198.1 204.9L199.4 205L200.5 205.6L201.6 206.1L202.3 207.1L203 208L203.3 209.2L203.5 210.4L203.5 219.2L203.5 228.1L196.8 228.8L189.9 229.3L189.9 229.3Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M24.8 189.3L25.8 189.5L26.7 189.7L27.6 189.8L27.6 178.2L27.6 166.5L27.6 154.8L26.7 154.7L25.8 154.5L24.8 154.3L24.8 166L24.8 177.7Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M23.6 154.1L25.4 154.4L27.1 154.7L28.9 155L28.9 154L28.9 153L28.9 152L27.1 151.7L25.4 151.4L23.6 151.1L23.6 152.1L23.6 153.1Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M45.5 192.3L46.6 192.5L47.8 192.6L48.9 192.7L48.9 181.1L48.9 169.4L48.9 157.7L47.8 157.6L46.6 157.5L45.5 157.3L45.5 169L45.5 180.7Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M44 157.2L46.1 157.4L48.3 157.7L50.5 157.9L50.5 156.9L50.5 155.9L50.5 154.9L48.3 154.7L46.1 154.4L44 154.2L44 155.2L44 156.2Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M70 194.6L71.3 194.7L72.6 194.8L73.9 194.9L73.9 183.2L73.9 171.6L73.9 159.9L72.6 159.8L71.3 159.7L70 159.6L70 171.3L70 183Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M68.3 159.5L70.7 159.7L73.2 159.9L75.7 160L75.7 159L75.7 158L75.7 157L73.2 156.9L70.7 156.7L68.3 156.5L68.3 157.5L68.3 158.5Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M97.2 196.1L98.6 196.1L100 196.2L101.4 196.2L101.4 184.5L101.4 172.9L101.4 161.2L100 161.2L98.6 161.1L97.2 161.1L97.2 172.7L97.2 184.4Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M95.4 161L98 161.1L100.6 161.2L103.3 161.3L103.3 160.3L103.3 159.3L103.3 158.3L100.6 158.2L98 158.1L95.4 158L95.4 159L95.4 160Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M125.8 196.6L127.3 196.6L128.7 196.6L130.2 196.6L130.2 184.9L130.2 173.3L130.2 161.6L128.7 161.6L127.3 161.6L125.8 161.6L125.8 173.3L125.8 184.9Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M123.9 161.6L126.6 161.6L129.4 161.6L132.1 161.6L132.1 160.6L132.1 159.6L132.1 158.6L129.4 158.6L126.6 158.6L123.9 158.6L123.9 159.6L123.9 160.6Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M154.6 196.2L156 196.2L157.4 196.1L158.8 196.1L158.8 184.4L158.8 172.7L158.8 161.1L157.4 161.1L156 161.2L154.6 161.2L154.6 172.9L154.6 184.5Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M152.7 161.3L155.4 161.2L158 161.1L160.6 161L160.6 160L160.6 159L160.6 158L158 158.1L155.4 158.2L152.7 158.3L152.7 159.3L152.7 160.3Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M182.1 194.9L183.4 194.8L184.7 194.7L186 194.6L186 183L186 171.3L186 159.6L184.7 159.7L183.4 159.8L182.1 159.9L182.1 171.6L182.1 183.2Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M180.3 160L182.8 159.9L185.3 159.7L187.7 159.5L187.7 158.5L187.7 157.5L187.7 156.5L185.3 156.7L182.8 156.9L180.3 157L180.3 158L180.3 159Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M13.2 186.9L13.2 176.5L13.2 166.1L13.4 164.9L13.5 163.8L14 162.9L14.4 162L15.1 161.5L15.8 160.9L16.6 160.9L17.5 160.9L18.3 161.3L19.2 161.7L20 162.5L20.7 163.4L21.2 164.5L21.7 165.6L21.9 166.8L22.1 168.1L22.1 178.4L22.1 188.8L17.5 187.9L13.2 186.9L13.2 186.9Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M30.6 190.3L30.6 179.9L30.6 169.6L30.8 168.4L31 167.2L31.6 166.3L32.2 165.4L33.1 164.8L34 164.3L35.1 164.2L36.2 164.1L37.3 164.5L38.4 164.9L39.4 165.7L40.3 166.5L41 167.6L41.6 168.7L41.9 170L42.1 171.2L42.1 181.6L42.1 191.9L36.2 191.1L30.6 190.3L30.6 190.3Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M52.5 193.1L52.5 182.7L52.5 172.4L52.7 171.2L53 170L53.7 169.1L54.4 168.1L55.5 167.6L56.6 167L57.9 166.9L59.2 166.8L60.5 167.1L61.8 167.5L62.9 168.2L64 169L64.8 170.1L65.5 171.2L65.8 172.4L66.1 173.6L66.1 184L66.1 194.3L59.2 193.8L52.5 193.1L52.5 193.1Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M77.9 195.2L77.9 184.8L77.9 174.4L78.2 173.2L78.5 172L79.3 171.1L80.1 170.1L81.3 169.5L82.5 168.9L83.9 168.7L85.4 168.6L86.8 168.9L88.3 169.2L89.5 169.9L90.7 170.6L91.5 171.7L92.4 172.7L92.7 174L93 175.2L93 185.5L93 195.9L85.4 195.6L77.9 195.2L77.9 195.2Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M105.7 196.3L105.7 186L105.7 175.6L106 174.4L106.3 173.2L107.2 172.2L108 171.2L109.3 170.6L110.6 169.9L112.1 169.7L113.6 169.5L115.1 169.8L116.6 170L117.9 170.7L119.2 171.4L120 172.4L120.9 173.4L121.2 174.6L121.5 175.8L121.5 186.2L121.5 196.6L113.6 196.5L105.7 196.3L105.7 196.3Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M134.5 196.6L134.5 186.2L134.5 175.8L134.8 174.6L135.1 173.4L136 172.4L136.8 171.4L138.1 170.7L139.4 170L140.9 169.8L142.4 169.5L143.9 169.7L145.4 169.9L146.7 170.6L148 171.2L148.8 172.2L149.7 173.2L150 174.4L150.3 175.6L150.3 186L150.3 196.3L142.4 196.5L134.5 196.6L134.5 196.6Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M163 195.9L163 185.5L163 175.2L163.3 174L163.6 172.7L164.5 171.7L165.3 170.6L166.5 169.9L167.7 169.2L169.2 168.9L170.6 168.6L172.1 168.7L173.5 168.9L174.7 169.5L175.9 170.1L176.7 171.1L177.5 172L177.8 173.2L178.1 174.4L178.1 184.8L178.1 195.2L170.6 195.6L163 195.9L163 195.9Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M189.9 194.3L189.9 184L189.9 173.6L190.2 172.4L190.5 171.2L191.2 170.1L192 169L193.1 168.2L194.2 167.5L195.5 167.1L196.8 166.8L198.1 166.9L199.4 167L200.5 167.6L201.6 168.1L202.3 169.1L203 170L203.3 171.2L203.5 172.4L203.5 182.7L203.5 193.1L196.8 193.8L189.9 194.3L189.9 194.3Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M24.8 151.3L25.8 151.5L26.7 151.7L27.6 151.8L27.6 140.8L27.6 129.8L27.6 118.8L26.7 118.7L25.8 118.5L24.8 118.3L24.8 129.3L24.8 140.3Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M23.6 118.1L25.4 118.4L27.1 118.7L28.9 119L28.9 118L28.9 117L28.9 116L27.1 115.7L25.4 115.4L23.6 115.1L23.6 116.1L23.6 117.1Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M45.5 154.3L46.6 154.5L47.8 154.6L48.9 154.7L48.9 143.7L48.9 132.7L48.9 121.7L47.8 121.6L46.6 121.5L45.5 121.3L45.5 132.3L45.5 143.3Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M44 121.2L46.1 121.4L48.3 121.7L50.5 121.9L50.5 120.9L50.5 119.9L50.5 118.9L48.3 118.7L46.1 118.4L44 118.2L44 119.2L44 120.2Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M70 156.6L71.3 156.7L72.6 156.8L73.9 156.9L73.9 145.9L73.9 134.9L73.9 123.9L72.6 123.8L71.3 123.7L70 123.6L70 134.6L70 145.6Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M68.3 123.5L70.7 123.7L73.2 123.9L75.7 124L75.7 123L75.7 122L75.7 121L73.2 120.9L70.7 120.7L68.3 120.5L68.3 121.5L68.3 122.5Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M97.2 158.1L98.6 158.1L100 158.2L101.4 158.2L101.4 147.2L101.4 136.2L101.4 125.2L100 125.2L98.6 125.1L97.2 125.1L97.2 136.1L97.2 147.1Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M95.4 125L98 125.1L100.6 125.2L103.3 125.3L103.3 124.3L103.3 123.3L103.3 122.3L100.6 122.2L98 122.1L95.4 122L95.4 123L95.4 124Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M125.8 158.6L127.3 158.6L128.7 158.6L130.2 158.6L130.2 147.6L130.2 136.6L130.2 125.6L128.7 125.6L127.3 125.6L125.8 125.6L125.8 136.6L125.8 147.6Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M123.9 125.6L126.6 125.6L129.4 125.6L132.1 125.6L132.1 124.6L132.1 123.6L132.1 122.6L129.4 122.6L126.6 122.6L123.9 122.6L123.9 123.6L123.9 124.6Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M154.6 158.2L156 158.2L157.4 158.1L158.8 158.1L158.8 147.1L158.8 136.1L158.8 125.1L157.4 125.1L156 125.2L154.6 125.2L154.6 136.2L154.6 147.2Z" fill="currentColor" fill-opacity="0.22" stroke-width="1.2"/><path d="M152.7 125.3L155.4 125.2L158 125.1L160.6 125L160.6 124L160.6 123L160.6 122L158 122.1L155.4 122.2L152.7 122.3L152.7 123.3L152.7 124.3Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/><path d="M13.2 148.9L13.2 139.5L13.2 130.1L13.4 128.9L13.5 127.8L14 126.9L14.4 126L15.1 125.5L15.8 124.9L16.6 124.9L17.5 124.9L18.3 125.3L19.2 125.7L20 126.5L20.7 127.4L21.2 128.5L21.7 129.6L21.9 130.8L22.1 132.1L22.1 141.4L22.1 150.8L17.5 149.9L13.2 148.9L13.2 148.9Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M30.6 152.3L30.6 142.9L30.6 133.6L30.8 132.4L31 131.2L31.6 130.3L32.2 129.4L33.1 128.8L34 128.3L35.1 128.2L36.2 128.1L37.3 128.5L38.4 128.9L39.4 129.7L40.3 130.5L41 131.6L41.6 132.7L41.9 134L42.1 135.2L42.1 144.6L42.1 153.9L36.2 153.1L30.6 152.3L30.6 152.3Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M52.5 155.1L52.5 145.7L52.5 136.4L52.7 135.2L53 134L53.7 133.1L54.4 132.1L55.5 131.6L56.6 131L57.9 130.9L59.2 130.8L60.5 131.1L61.8 131.5L62.9 132.2L64 133L64.8 134.1L65.5 135.2L65.8 136.4L66.1 137.6L66.1 147L66.1 156.3L59.2 155.8L52.5 155.1L52.5 155.1Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M77.9 157.2L77.9 147.8L77.9 138.4L78.2 137.2L78.5 136L79.3 135.1L80.1 134.1L81.3 133.5L82.5 132.9L83.9 132.7L85.4 132.6L86.8 132.9L88.3 133.2L89.5 133.9L90.7 134.6L91.5 135.7L92.4 136.7L92.7 138L93 139.2L93 148.5L93 157.9L85.4 157.6L77.9 157.2L77.9 157.2Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M105.7 158.3L105.7 149L105.7 139.6L106 138.4L106.3 137.2L107.2 136.2L108 135.2L109.3 134.6L110.6 133.9L112.1 133.7L113.6 133.5L115.1 133.8L116.6 134L117.9 134.7L119.2 135.4L120 136.4L120.9 137.4L121.2 138.6L121.5 139.8L121.5 149.2L121.5 158.6L113.6 158.5L105.7 158.3L105.7 158.3Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/><path d="M134.5 158.6L134.5 149.2L134.5 139.8L134.8 138.6L135.1 137.4L136 136.4L136.8 135.4L138.1 134.7L139.4 134L140.9 133.8L142.4 133.5L143.9 133.7L145.4 133.9L146.7 134.6L148 135.2L148.8 136.2L149.7 137.2L150 138.4L150.3 139.6L150.3 149L150.3 158.3L142.4 158.5L134.5 158.6L134.5 158.6Z" fill="var(--c-hueco,#222)" stroke-width="2.2"/></g><g stroke="currentColor" stroke-linejoin="round"><path d="M15.1 93.3L16.7 93.7L18.3 94L19.9 94.4L19.9 97.4L19.9 100.4L19.9 103.4L18.3 103L16.7 102.7L15.1 102.3L15.1 99.3L15.1 96.3Z" fill="var(--c-hueco,#222)" stroke-width="1.8"/><path d="M55.5 99.4L57.9 99.6L60.4 99.9L62.9 100.1L62.9 103.1L62.9 106.1L62.9 109.1L60.4 108.9L57.9 108.6L55.5 108.4L55.5 105.4L55.5 102.4Z" fill="var(--c-hueco,#222)" stroke-width="1.8"/><path d="M109.3 102.4L112.1 102.5L115 102.5L117.9 102.6L117.9 105.6L117.9 108.6L117.9 111.6L115 111.5L112.1 111.5L109.3 111.4L109.3 108.4L109.3 105.4Z" fill="var(--c-hueco,#222)" stroke-width="1.8"/><path d="M25.1 115.4L25.8 115.5L26.6 115.6L27.4 115.8L27.4 107.1L27.4 98.4L27.4 89.8L26.6 89.6L25.8 89.5L25.1 89.4L25.1 98L25.1 106.7Z" fill="currentColor" fill-opacity="0.16" stroke-width="1"/><path d="M45.8 118.4L46.7 118.5L47.7 118.6L48.6 118.7L48.6 110L48.6 101.4L48.6 92.7L47.7 92.6L46.7 92.5L45.8 92.4L45.8 101L45.8 109.7Z" fill="currentColor" fill-opacity="0.16" stroke-width="1"/><path d="M70.3 120.7L71.4 120.7L72.5 120.8L73.6 120.9L73.6 112.2L73.6 103.5L73.6 94.9L72.5 94.8L71.4 94.7L70.3 94.7L70.3 103.3L70.3 112Z" fill="currentColor" fill-opacity="0.16" stroke-width="1"/><path d="M97.6 122.1L98.7 122.1L99.9 122.2L101 122.2L101 113.5L101 104.9L101 96.2L99.9 96.2L98.7 96.1L97.6 96.1L97.6 104.8L97.6 113.4Z" fill="currentColor" fill-opacity="0.16" stroke-width="1"/></g><path d="M125.5 94.6L131.8 108.6L138.1 122.6L134.3 122.6L130.5 122.6L125.5 108.6L120.4 94.6L122.9 94.6Z" fill="var(--c-int,#777)" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 84L19.4 86.3L30.6 88.3L43.6 90.1L58.1 91.7L73.8 92.9L90.5 93.8L107.8 94.4L125.5 94.6L127 98.1L128.6 101.6L130.2 105.1L131.8 108.6L133.4 112.1L135 115.6L136.6 119.1L138.1 122.6L142.9 122.5L147.6 122.4L152.3 122.3L156.9 122.1L161.6 122L166.2 121.8L170.7 121.6L175.2 121.3L175.2 123.1L175.2 124.8L175.2 126.6L175.2 128.3L175.2 130.1L175.2 131.8L175.2 133.6L175.2 135.3L176.9 135.2L178.7 135.1L180.5 135L182.2 134.9L183.9 134.8L185.7 134.7L187.4 134.5L189.1 134.4L189.1 137.2L189.1 139.9L189.1 142.7L189.1 145.4L189.1 148.2L189.1 150.9L189.1 153.7L189.1 156.4L191.3 156.2L193.5 156L195.7 155.9L197.9 155.7L200.1 155.5L202.2 155.2L204.3 155L206.4 154.8L206.4 157.1L206.4 159.3L206.4 161.6L206.4 163.8L206.4 166.1L206.4 168.3L206.4 170.6L206.4 172.8L207.6 172.7L208.9 172.5L210.2 172.4L211.4 172.2L212.6 172.1L213.9 171.9L215.1 171.8L216.3 171.6L216.3 174.1L216.3 176.6L216.3 179.1L216.3 181.6L216.3 184.1L216.3 186.6L216.3 189.1L216.3 191.6L217.2 191.5L218.2 191.4L219.1 191.2L220 191.1L220.9 191L221.8 190.9L222.7 190.7L223.6 190.6L223.6 195.3L223.6 200.1L223.6 204.8L223.6 209.6L223.6 214.3L223.6 219.1L223.6 223.8L223.6 228.6L199.3 231.5L171 233.5L140.4 234.5L109 234.4L78.8 233.2L51.2 231L27.8 227.9L10 224L10 206.5L10 189L10 171.5L10 154L10 136.5L10 119L10 101.5Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>'
};
// el icono de cada viaje, por ciudad de destino (volver a Madrid es la casa; lo que no tiene, el avion)
var ICONO_CIUDAD=[ [/Coru/,"torre-hercules"], [/xico/,"bandera-mexico"], [/Canc/,"piramide"], [/Par/,"eiffel"], [/msterdam/,"tulipanes"], [/Bruselas/,"atomium"], [/Roma/,"coliseo"], [/^Madrid$/,"house-line"] ];
function iconoViaje(v){ for(var i=0;i<ICONO_CIUDAD.length;i++) if(ICONO_CIUDAD[i][0].test(v.a)) return ICONO_CIUDAD[i][1]; return "airplane-tilt"; }
function ico(n){ return PROPIOS[n] ? '<svg viewBox="0 0 256 256" aria-hidden="true">'+PROPIOS[n]+'</svg>'
                                   : '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="'+(PH[n]||PH.circle)+'"/></svg>'; }
function esc(t){ return String(t==null?"":t).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function el(tag,cls,html){ var d=document.createElement(tag); if(cls) d.className=cls; if(html!=null) d.innerHTML=html; return d; }
function plural(n,uno,varios){ return n+" "+(n===1?uno:(varios||uno+"s")); }

/* ------------------------------ estilo ------------------------------
   Reglas en docs/DISENO-ARC.md. Resumen: un acento (--arc, ambar) que
   solo marca "hecho", como mucho en 2 sitios por pantalla; tamanos 12,
   15 y 28; pesos 600, 700 y 800; etiquetas en mayusculas con .08em;
   8-12 px dentro de un grupo y 40 px entre grupos; 2 niveles de caja
   como mucho; zonas tactiles de 44 px; foco visible.                   */
var CSS=
  ".arcV{--arc:#f0b429;--arcTx:#141518}"+
  "html[data-tema=claro] .arcV{--arc:#8a5a00;--arcTx:#ffffff}"+
  ".arcV button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}"+
  ".arcV :focus-visible{outline:2px solid var(--fg);outline-offset:2px}"+
  ".arcL{display:block;margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}"+
  ".arcT{font-size:15px;font-weight:700;color:var(--fg);line-height:1.35}"+
  ".arcS{font-size:12px;font-weight:600;color:var(--mu);line-height:1.4}"+
  ".arcN{font-size:28px;font-weight:800;letter-spacing:-.02em;line-height:1;color:var(--fg)}"+
  ".arcAviso{display:flex;gap:8px;align-items:flex-start;margin:8px 0 0;font-size:12px;font-weight:600;line-height:1.4;color:var(--mu)}"+
  ".arcAviso svg{width:16px;height:16px;flex:0 0 auto;margin-top:1px}"+
  ".arcAviso button{margin-left:auto;min-height:44px;padding:0 12px;border-radius:22px;border:1px solid var(--ln);background:none;color:var(--fg);font-size:12px;font-weight:700;margin-top:-13px}"+
  ".arcMal{color:var(--mal,#ffb4a0)}"+
  "html[data-tema=claro] .arcMal{color:#a33a22}"+
  /* fila que abre la pantalla Arc */
  ".arcAbre{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:0;border:0;background:none;color:inherit;text-align:left}"+
  ".arcAbre>span{flex:1 1 auto;min-width:0}"+
  ".arcAbre>svg{width:16px;height:16px;flex:0 0 auto;opacity:.7}"+
  /* bloque suelto de HOY (sin reglas, D, C) */
  ".arcBloque{background:var(--sf);border-radius:20px;padding:4px 16px 12px;margin-bottom:12px}"+
  /* un check: boton redondo de 44 px */
  ".arcCk{position:relative;width:44px;height:44px;flex:0 0 auto;border-radius:50%;border:2px solid var(--ln);background:none;color:var(--mu);"+
    "display:flex;align-items:center;justify-content:center;padding:0;transition:background-color .15s ease,border-color .15s ease}"+
  ".arcCk svg{width:20px;height:20px}"+
  ".arcCk.auto{border-style:dashed}"+
  ".arcCk.on{background:var(--arc);border-color:var(--arc);color:var(--arcTx)}"+
  ".arcCk:disabled{opacity:.55;cursor:default}"+
  /* chips con nombre (C y el detalle de un dia) */
  ".arcChips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}"+
  ".arcChip{display:inline-flex;align-items:center;gap:8px;min-height:44px;max-width:100%;padding:0 14px 0 10px;border-radius:22px;border:1px solid var(--ln);"+
    "background:var(--sf2);color:var(--fg);font-size:15px;font-weight:600;text-align:left;transition:border-color .15s ease}"+
  ".arcChip svg{width:20px;height:20px;flex:0 0 auto;color:var(--mu)}"+
  ".arcChip span{min-width:0;padding:6px 0;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}"+
  ".arcChip.auto{background:none;border-style:dashed}"+
  ".arcChip.on{border-color:var(--arc)} .arcChip.on svg{color:var(--arc)}"+
  ".arcChip:disabled{opacity:.55;cursor:default}"+
  /* A · anillos en la tarjeta del dia: van en el color del texto de la tarjeta */
  /* A · el Arc en HOY: bajo la semana, encima del entreno, con su superficie propia (ambar muy tenue) */
  ".arcV{--arcSf:#211b0f}"+
  "html[data-tema=claro] .arcV{--arcSf:#f6ecd6}"+
  ".arcHoyA{background:var(--arcSf);padding:4px 16px 12px}"+
  ".arcHoyA .arcL{color:var(--fg)}"+
  ".arcHoyA .arcAn small{color:var(--fg)}"+
  ".arcHoyA .ring .pista{stroke:var(--mu);opacity:.35}"+
  ".arcHoyA .ring .arco{stroke:var(--arc)}"+
  ".arcHoyA .ring path{fill:var(--fg)}"+
  ".arcA{position:relative;margin-top:16px;padding-top:8px;border-top:1px solid currentColor;border-top-color:rgba(127,127,127,.35)}"+
  ".arcA .arcL{color:inherit}"+
  ".arcA .arcAviso,.arcA .arcMal,html[data-tema=claro] .arcA .arcMal{color:inherit}"+
  ".arcA .arcAviso button{color:inherit;border-color:currentColor}"+
  ".arcAn{display:flex;gap:8px;margin-top:4px}"+
  ".arcAn>*{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px 0;border:0;background:none;color:inherit;min-height:44px}"+
  ".arcAn svg.ring{width:44px;height:44px}"+
  ".arcAn small{font-size:12px;font-weight:600;line-height:1.3;text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}"+
  ".arcAn.grande svg.ring{width:72px;height:72px}"+
  ".arcAn.grande small{font-size:12px;color:var(--mu);opacity:1}"+
  ".ring .pista{stroke:currentColor;opacity:.25}"+
  ".ring .arco{stroke:currentColor;transition:stroke-dasharray .15s ease}"+
  ".arcAn.grande .ring .arco{stroke:var(--arc)}"+
  /* B · filas de la linea del dia */
  ".arcB .linPto{background:none;box-shadow:none}"+
  ".arcB .arcCk{width:36px;height:36px;margin-top:0;box-shadow:0 0 0 4px var(--bg)}"+
  ".arcB .arcCk::after{content:\"\";position:absolute;inset:-5px}"+
  ".arcB .arcCk svg{width:18px;height:18px}"+
  ".arcB .linCab{cursor:default}"+
  ".arcB .linCab em{font-size:12px} .arcB .linCab b{font-size:15px;font-weight:700} .arcB .linCab small{font-size:12px}"+
  ".arcBDia{display:flex;align-items:center;gap:8px;margin:0 6px 4px}"+
  /* C · temporada */
  ".arcC{padding:8px 16px 12px}"+
  ".arcC .arcAbre{align-items:baseline}"+
  ".arcC .arcAbre b{font-size:15px;font-weight:700;color:var(--fg);white-space:nowrap}"+
  ".arcSem{display:grid;grid-template-columns:repeat(7,1fr);margin-top:4px}"+
  ".arcSem>*{display:flex;flex-direction:column;align-items:center;gap:2px;min-height:44px;padding:2px 0;border:0;background:none;color:var(--mu)}"+
  ".arcSem i{font-style:normal;font-size:12px;font-weight:700;letter-spacing:.06em}"+
  ".arcSem svg{width:22px;height:22px}"+
  ".dot .pista{fill:none;stroke:var(--ln);stroke-width:2}"+
  ".dot .arco{fill:none;stroke:var(--arc);stroke-width:4}"+
  ".dot .lleno{fill:var(--arc)}"+
  ".dot .hoy{fill:none;stroke:var(--fg);stroke-width:2}"+
  ".dot.fut .pista{stroke-dasharray:2 3}"+
  ".arcRevTj{background:var(--sf);border-radius:20px;padding:12px 16px;margin-bottom:12px}"+
  ".arcRevTj .arcT{margin-top:4px}"+
  /* D · fila compacta */
  ".arcD{display:flex;align-items:center;gap:8px;padding:4px 8px 4px 16px}"+
  ".arcD .arcAbre{flex:1 1 auto;min-width:0}"+
  ".arcD .arcCks{display:flex;gap:8px}"+
  /* pantalla */
  "#arcP section{margin-top:40px} #arcP section:first-child{margin-top:8px}"+
  "#arcP h3{margin:0 0 8px}"+
  ".arcCaja{background:var(--sf);border-radius:20px;padding:12px 16px}"+
  ".arcCaja+.arcCaja{margin-top:12px}"+
  ".arcRevFila{width:100%;border:0;border-top:1px solid var(--ln);background:none;color:var(--fg);text-align:left;padding:8px 0;min-height:56px}"+
  ".arcRevFila>svg{width:16px;height:16px;flex:0 0 auto;color:var(--mu)}"+
  ".arcCont{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}"+
  ".arcFila{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 0;border-top:1px solid var(--ln)}"+
  ".arcFila:first-child{border-top:0}"+
  ".arcFila>span{flex:1 1 auto;min-width:0}"+
  ".arcFila>svg{width:20px;height:20px;flex:0 0 auto;color:var(--mu)}"+
  ".arcFila .arcT{display:block;overflow-wrap:anywhere}"+
  ".arcFila .arcS{display:block}"+
  ".arcIcoBtn{width:44px;height:44px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;border:0;background:none;color:var(--mu);border-radius:12px;padding:0}"+
  ".arcIcoBtn svg{width:20px;height:20px}"+
  ".arcHora{width:92px;min-height:44px;border-radius:12px;border:1px solid var(--ln);background:var(--sf2);color:var(--fg);font:600 15px Manrope,sans-serif;padding:0 8px}"+
  ".arcCurvaW{margin-top:12px}"+
  ".arcCurvaEt{position:relative;height:20px;margin-top:4px}"+
  ".arcCurvaEt span{position:absolute;top:0;transform:translateX(-50%)}"+
  ".arcCurva .sep{stroke:var(--ln);stroke-width:1;vector-effect:non-scaling-stroke}"+
  /* la etapa en curso: cabecera, nombre, miliario, tira y proxima parada */
  ".arcEtCab{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:20px}"+
  ".arcEtCab .arcL{display:inline-flex;align-items:center;gap:8px;margin:0}"+
  ".arcEtCab svg{width:16px;height:16px}"+
  ".arcEtCuerpo{display:grid;grid-template-columns:1fr 104px;column-gap:16px;align-items:end;margin-top:8px}"+
  ".arcEtNom{margin:0;line-height:1.05;text-wrap:balance}"+
  ".arcEtSub{margin:8px 0 0;font-weight:600;color:var(--mu);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}"+
  ".arcMil{min-height:112px;border-radius:52px 52px 10px 10px;background:var(--sf2);padding:20px 8px 12px;display:flex;flex-direction:column;"+
    "justify-content:flex-end;align-items:center;text-align:center}"+
  ".arcMil b{font-size:40px;font-weight:800;letter-spacing:-.03em;line-height:1;color:var(--fg)}"+
  ".arcMil .arcL{margin-top:4px;line-height:1.25;letter-spacing:.06em}"+
  ".arcMil>svg{width:40px;height:40px;color:var(--fg)}"+
  ".arcSello{display:flex;align-items:center;gap:8px;min-height:44px;margin:0 0 8px;padding:0;border:0;background:none;color:var(--mu);font-size:12px;font-weight:600;text-align:left}"+
  ".arcSello svg{width:16px;height:16px;color:var(--fg)}"+
  ".arcTiraW{position:relative;margin-top:16px}"+
  ".arcTira{display:block;width:100%;height:56px;overflow:visible}"+
  ".arcTira.corta{width:auto;height:28px;max-width:100%}"+
  ".arcTira .base{stroke:var(--ln);stroke-width:1}"+
  ".arcTira .hecho{fill:var(--arc);transition:fill .15s ease}"+
  ".arcTira .tinta{fill:var(--fg)}"+
  ".arcTira .medio{fill:var(--mu)}"+
  ".arcTira .nada{fill:var(--ln)}"+
  ".arcTira .fut{fill:var(--mu);opacity:.5}"+
  ".arcTira .hoyC{fill:none;stroke:var(--fg);stroke-width:1.5}"+
  ".arcTira .hoyL{stroke:var(--fg);stroke-width:1}"+
  ".arcTira .estancia{stroke:var(--mu);stroke-width:1.5}"+
  ".arcTira .estancia.posible{stroke-dasharray:2 3}"+
  ".arcTira .vM{color:var(--mu)} .arcTira .vT{color:var(--fg)}"+
  ".arcTira .muesca{fill:var(--mu)} .arcTira .muescaT{fill:var(--fg)}"+
  ".arcTiraEt{position:relative;height:20px;margin-top:4px}"+
  ".arcTiraEt span{position:absolute;top:0;white-space:nowrap}"+
  ".arcTiraEt .izq{left:0} .arcTiraEt .der{right:0} .arcTiraEt .hoy{transform:translateX(-50%);color:var(--fg)}"+
  ".arcProx{display:flex;align-items:center;gap:12px;min-height:44px;margin-top:8px}"+
  ".arcProx>svg{width:44px;height:44px;color:var(--fg);flex:0 0 auto}"+
  ".arcProx>span:nth-child(2){flex:1 1 auto;min-width:0} .arcProx .arcT,.arcProx .arcS{display:block}"+
  ".arcProx>.arcL,.arcProx>.arcS{flex:0 0 auto;margin:0}"+
  /* lo que pide la etapa */
  ".arcPide{margin-top:0}"+
  ".arcPideC{margin:8px 0 0}"+
  ".arcPideF{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:baseline;margin-top:12px}"+
  ".arcPideF b{font-weight:700}"+
  ".arcBarra{grid-column:1/-1;height:4px;border-radius:2px;background:var(--ln);overflow:hidden}"+
  ".arcBarra i{display:block;height:100%;background:var(--fg)}"+
  ".arcPideU{margin-top:12px}"+
  /* la hoja de ruta */
  ".arcTramos{list-style:none;margin:8px 0 0;padding:0}"+
  ".arcTramoLi{position:relative}"+
  ".arcTramoLi:not(:last-child)::before{content:\"\";position:absolute;left:15px;top:44px;bottom:-12px;width:0;border-left:2px dashed var(--ln)}"+
  ".arcTramoLi.sellada:not(:last-child)::before{border-left:2px solid var(--fg)}"+
  ".arcTramo{position:relative;display:grid;grid-template-columns:32px 1fr auto;column-gap:12px;row-gap:8px;width:100%;padding:12px 0 20px;"+
    "min-height:96px;border:0;background:none;color:var(--fg);text-align:left;align-items:center}"+
  ".arcNodo{grid-row:1;grid-column:1;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;"+
    "font-size:12px;font-weight:800;letter-spacing:.06em;border:2px dashed var(--ln);background:var(--bg);color:var(--mu);position:relative;z-index:1}"+
  ".arcTramoLi.actual .arcNodo{border:2px solid var(--fg);color:var(--fg)}"+
  ".arcTramoLi.sellada .arcNodo{border:2px solid var(--fg);background:var(--fg);color:var(--bg)}"+
  ".arcTramoN{grid-column:2;display:flex;align-items:center;gap:8px;min-width:0}"+
  ".arcTramoN svg{width:16px;height:16px;color:var(--mu);flex:0 0 auto}"+
  ".arcTramoD{grid-column:3;display:inline-flex;align-items:center;gap:4px;margin:0;white-space:nowrap}"+
  ".arcTramoLi.sellada .arcTramoD,.arcTramoLi.actual .arcTramoD{color:var(--fg)}"+
  ".arcTramoD svg{width:16px;height:16px}"+
  ".arcTramoLi.futura .arcTramoN .arcT{color:var(--mu)}"+
  ".arcTramoT{grid-column:2/-1;display:block;line-height:0}"+
  ".arcTramoS{grid-column:2/-1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"+
  ".arcTramoDentro{margin:0 0 20px 36px}"+
  ".arcTramoDentro .arcGrid{gap:2px}"+
  "#appHoy,#appPant{--c-muro:#9aa0a8;--c-int:#5d626a;--c-hueco:#1b1e23}"+
  "html[data-tema=claro] :is(#appHoy,#appPant){--c-muro:#d3d5da;--c-int:#a3a6ad;--c-hueco:#4b4f57}"+
  ".arcViaje{display:grid;grid-template-columns:48px 1fr;column-gap:12px;align-items:center;min-height:44px;padding:4px 0}"+
  ".arcViaje svg{width:48px;height:48px;color:var(--fg)} .arcViaje.posible svg{color:var(--mu)}"+
  ".arcViaje .arcS{grid-column:2}"+
  ".arcViaje.posible .arcT{color:var(--mu)}"+
  ".arcViaje .arcL{display:inline;margin:0}"+
  ".arcActa .arcCifras{display:grid;grid-template-columns:repeat(3,1fr);gap:16px 8px;margin-top:12px}"+
  ".arcCifras div{display:flex;flex-direction:column;gap:4px;min-width:0}"+
  ".arcCifras .arcL{margin:0}"+
  ".arcSubIn{margin-top:8px}"+
  ".arcEtEd{padding:12px 0;border-top:1px solid var(--ln)} .arcEtEd:first-child{border-top:0;padding-top:0}"+
  ".arcEtTop{display:flex;gap:8px;align-items:center}"+
  ".arcEtFechas{display:flex;gap:8px;align-items:center;margin-top:8px}"+
  ".arcFecha{flex:1 1 0;min-width:0;min-height:44px;border-radius:12px;border:1px solid var(--ln);background:var(--sf2);color:var(--fg);font:600 15px Manrope,sans-serif;padding:0 8px}"+
  ".arcCurva{display:block;width:100%;height:64px}"+
  ".arcCurva line{stroke:var(--ln);stroke-width:1}"+
  ".arcCurva polyline{fill:none;stroke:var(--fg);stroke-width:2;vector-effect:non-scaling-stroke;stroke-linejoin:round}"+
  ".arcTiles{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px}"+
  ".arcTiles div{display:flex;flex-direction:column;gap:4px}"+
  ".arcFila>b{flex:0 0 auto}"+
  ".arcBar{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;padding:8px 0}"+
  ".arcBar span{font-size:15px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fg)}"+
  ".arcBar em{font-style:normal;font-size:12px;font-weight:700;color:var(--mu)}"+
  ".arcBar div{grid-column:1/-1;height:4px;border-radius:2px;background:var(--sf2);overflow:hidden}"+
  ".arcBar div i{display:block;height:100%;background:var(--fg);opacity:.7}"+
  /* rejillas: la temporada (18 semanas x 7 dias) */
  ".arcCal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:8px}"+
  ".arcCal i{font-style:normal;text-align:center;font-size:12px;font-weight:700;color:var(--mu);letter-spacing:.06em}"+
  ".arcCal span{height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--mu);background:var(--sf2)}"+
  ".arcCal span.si{background:var(--mu);color:var(--bg)}"+
  ".arcCal span.no{background:none}"+
  ".arcGrid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin-top:8px;align-items:center}"+
  ".arcGrid i{font-style:normal;font-size:12px;font-weight:700;color:var(--mu);text-align:center;letter-spacing:.06em}"+
  ".arcGrid b{font-size:12px;font-weight:700;color:var(--mu)}"+
  ".arcGrid>button,.arcGrid>span{height:44px;border-radius:8px;border:1px solid var(--ln);background:none;padding:0;"+
    "font-size:12px;font-weight:600;color:var(--mu);display:flex;align-items:center;justify-content:center}"+
  ".arcGrid>button{position:relative;overflow:hidden;font-size:15px;font-weight:700;color:var(--fg)}"+
  ".arcGrid>span.fuera{border:0}"+
  ".arcGrid .cumplido{background:var(--fg);border-color:var(--fg);color:var(--bg)}"+
  ".arcGrid .medio{background:var(--sf2);border-color:var(--sf2)}"+
  ".arcGrid .medio i{position:absolute;left:0;bottom:0;height:3px;background:var(--mu)}"+
  ".arcGrid .nada{color:var(--mu)}"+
  ".arcGrid .futuro{border-color:transparent;color:var(--mu)}"+
  ".arcGrid .hoy{border:2px solid var(--fg)}"+
  ".arcGrid .sel{outline:2px solid var(--fg);outline-offset:1px}"+
  ".arcGrid .viaje em{position:absolute;top:5px;right:5px;width:5px;height:5px;border-radius:50%;background:currentColor}"+
  ".arcTabla{display:grid;grid-template-columns:32px repeat(7,1fr);row-gap:4px;margin-top:8px;align-items:center}"+
  ".arcTabla i{font-style:normal;font-size:12px;font-weight:700;color:var(--mu);text-align:center;letter-spacing:.06em}"+
  ".arcTabla b{font-size:12px;font-weight:700;color:var(--mu)}"+
  ".arcTabla svg{width:22px;height:22px;justify-self:center}"+
  "#arcP textarea,#arcP input[type=text]{width:100%;border-radius:14px;border:1px solid var(--ln);background:var(--sf2);color:var(--fg);"+
    "padding:12px;font:600 15px Manrope,sans-serif;min-height:48px}"+
  "#arcP textarea{min-height:88px;resize:vertical}"+
  "#arcP textarea:focus,#arcP input:focus,#arcP select:focus{outline:2px solid var(--fg);outline-offset:1px}"+
  "#arcP label.arcL{margin:12px 0 8px}"+
  ".arcSeg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}"+
  ".arcSeg button,.arcOp{min-height:44px;border-radius:14px;border:2px solid var(--ln);background:var(--sf2);color:var(--fg);font-size:15px;font-weight:700;"+
    "display:flex;align-items:center;justify-content:center;gap:8px;padding:0 12px}"+
  ".arcSeg button svg{width:20px;height:20px}"+
  ".arcSeg button[aria-pressed=true],.arcOp[aria-checked=true]{border-color:var(--fg)}"+
  ".arcOps{display:grid;gap:8px}"+
  ".arcOp{justify-content:flex-start;text-align:left;padding:10px 12px;min-height:56px}"+
  ".arcOp b{flex:0 0 28px;height:28px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800}"+
  ".arcOp span{display:block;font-size:15px;font-weight:700} .arcOp small{display:block;font-size:12px;font-weight:600;color:var(--mu)}"+
  ".arcBot{width:100%;min-height:52px;border-radius:26px;border:0;background:var(--fg);color:var(--bg);font-size:15px;font-weight:800;margin-top:12px}"+
  ".arcBot2{min-height:44px;padding:0 16px;border-radius:22px;border:1px solid var(--ln);background:none;color:var(--fg);font-size:15px;font-weight:700;margin-top:8px}"+
  ".arcVacio .arcT{margin-top:4px}"+
  ".arcSkel{height:12px;border-radius:6px;background:var(--sf2);margin-top:8px}"+
  "@media (prefers-reduced-motion:reduce){.arcCk,.arcChip,.ring .arco,.arcTira .hecho{transition:none}}";

/* ---------------------------- estado de la app ---------------------------- */
var P=null;          // lo que pasa la agenda: hoy(), acts(), eventos(), estadoActs(), abre(), almacen...
var S=null;          // { D, error, soloLectura }
var SALUD=null;      // Huawei Health importado: { fuente, desde, hasta, dias }
var selDia=null, editando=null, borrador=null, msgForm="", t0Carga=0, irRev=false, revAbiertas={};

function conecta(p){
  P=p; S=carga(p.almacen,p.hoy()); SALUD=cargaSalud(p.almacen);
  if(S.migrado && !S.soloLectura) guardaEn(p.almacen,S.D);
  if(typeof document!=="undefined" && !document.getElementById("arcCss")){
    var st=document.createElement("style"); st.id="arcCss"; st.textContent=CSS; document.head.appendChild(st);
  }
  registra();
}
function hoy(){ return P.hoy(); }
function ctx(){ return { acts:P.acts()||[], eventos:P.eventos||null, salud: SALUD ? SALUD.dias : null }; }
function guarda(){ if(S.soloLectura) return false; var ok=guardaEn(P.almacen,S.D); if(!ok) S.error="guardar"; else if(S.error==="guardar") S.error=null; return ok; }
// la agenda llama aqui cuando llegan el calendario o lo hecho
function registra(){ if(!P || !S || S.soloLectura) return; if(registraAuto(S.D,ctx(),hoy())) guarda(); }
function diseno(){ return P ? leeDiseno(P.almacen) : DISENO_DEF; }

function textoError(){
  return S.error==="almacen" ? "Este navegador no deja guardar datos: Arc no puede apuntar nada. Revisa que no estés en una ventana privada."
       : S.error==="roto"    ? "Los datos de Arc de este móvil no se pueden leer. No se ha borrado nada: se enseñan tal cual."
       : S.error==="nueva"   ? "Estos datos son de una versión más nueva de la app. Actualiza en Ajustes para poder cambiarlos."
       : S.error==="guardar" ? "No se ha podido guardar el último cambio. Vuelve a intentarlo; si sigue, libera espacio en el móvil."
       : "";
}
function estadoActs(){ return P.estadoActs ? P.estadoActs() : "ok"; }
function textoActs(){
  var e=estadoActs();
  if(e!=="cargando") t0Carga=0;
  if(e==="cargando"){
    if(!t0Carga) t0Carga=Date.now();
    return Date.now()-t0Carga>15000 ? "Strava y Hevy tardan más de lo normal. Lo automático sale con lo último guardado."
                                    : "Trayendo el calendario, Strava y Hevy…";
  }
  return e==="error" ? "Sin conexión con Strava y Hevy. Lo automático sale con lo último guardado."
       : e==="sin_conexion" ? "El calendario no está conectado: las reglas automáticas no saben qué tocaba."
       : "";
}
function hayAuto(){ return S.D.reglas.some(function(r){ return r.tipo==="auto"; }); }
// avisos de estado: error de datos y, si hay reglas automaticas, la conexion
function avisosEstado(w){
  var err=textoError();
  if(err){ var a=el("p","arcAviso arcMal",ico("warning-circle")+'<span>'+esc(err)+'</span>'); a.setAttribute("role","alert"); w.appendChild(a); }
  var ta=hayAuto() ? textoActs() : "";
  if(ta){
    var b=el("p","arcAviso"+(estadoActs()==="error"?" arcMal":""),ico(estadoActs()==="cargando"?"clock":"warning-circle")+'<span>'+esc(ta)+'</span>');
    b.setAttribute("role","status");
    if(estadoActs()==="error" && P.reintenta){
      var r=el("button","", "Reintentar"); r.addEventListener("click",function(){ P.reintenta(); }); b.appendChild(r);
    }
    w.appendChild(b);
  }
}
function icoRegla(r){
  if(r.id==="plan" || r.fuente==="plan") return "calendar-check";
  if(r.id==="dormir") return "moon";
  if(r.id==="estudio") return "book-open";
  return r.tipo==="manual" ? "hand-tap" : r.fuente==="gym" ? "barbell" : r.fuente==="correr" ? "sneaker-move" : "lightning";
}
function subRegla(r){ return r.tipo==="auto" ? "Automática · "+FUENTES[r.fuente] : "Manual · un toque"; }
// lo que dice cada regla de un dia
function estadoTxt(x,iso,h){
  var r=x.regla;
  if(iso>h) return "todavía no";
  if(x.ok===null) return r.tipo==="manual" ? "sin datos: antes de apuntarlo en la app" : "sin datos del calendario";
  if(x.como==="dato") return horasTxt(x.sueno)+" según Huawei";
  if(x.como==="a mano") return "hecho sin registrar";
  if(r.tipo==="manual") return x.ok ? "hecho" : iso===h ? "sin marcar" : "sin hacer";
  if(x.plan && x.plan.s===0) return x.plan.sinRegistro ? "caminata sin registro: no cuenta" : "sin sesión: cuenta sola";
  if(x.ok) return x.plan && x.plan.s>1 ? x.plan.h+" de "+x.plan.s+" sesiones" : "hecho";
  if(iso===h && estadoActs()==="cargando") return "mirando…";
  if(x.plan) return (iso===h ? "pendiente" : "sin hacer")+(x.plan.s>1 ? " · "+x.plan.h+" de "+x.plan.s : "")+(x.plan.sinRegistro ? " · caminata sin registro" : "");
  return iso===h ? "pendiente" : "sin hacer";
}
// una manual se toca; si Huawei ya dice que dormiste 7 h, no hace falta
function puedeMarcar(x,iso,h){ return x.regla.tipo==="manual" && enArc(iso) && iso<=h && !S.soloLectura && !(x.como==="dato" && x.ok); }
// lo automatico se marca "hecho sin registrar" solo desde el detalle de un dia
// (a proposito, no con un roce en HOY)
function puedeForzar(x,iso,h){ return x.regla.tipo==="auto" && enArc(iso) && iso<=h && !S.soloLectura && (!x.ok || x.como==="a mano"); }
function toca(x,iso,repinta){
  var on = !(x.como==="toque" || x.como==="a mano");     // marcado -> se quita; si no -> se marca
  if(!marcaCheck(S.D,iso,x.regla.id,on,hoy()).error){ guarda(); repinta(); }
}
function etiquetaCk(x,iso,h,forzar){
  return x.regla.nombre+": "+estadoTxt(x,iso,h)+(puedeMarcar(x,iso,h) ? ". Toca para cambiar"
    : forzar && puedeForzar(x,iso,h) ? (x.como==="a mano" ? ". Toca para quitarlo" : ". Toca si lo hiciste sin registrarlo") : "");
}
// check redondo de 44 px (B, D)
function check(x,iso,h,repinta){
  var auto=x.regla.tipo==="auto";
  // las automaticas no son botones: se ven, no se tocan
  var b=el(auto?"span":"button","arcCk"+(auto?" auto":"")+(x.ok?" on":""), ico(x.ok ? "check" : icoRegla(x.regla)));
  b.setAttribute("aria-label",etiquetaCk(x,iso,h));
  if(auto){ b.setAttribute("role","img"); return b; }
  if(x.regla.tipo==="manual") b.setAttribute("aria-pressed",x.ok?"true":"false");
  if(!puedeMarcar(x,iso,h)) b.disabled=true;
  else b.addEventListener("click",function(){ toca(x,iso,repinta); });
  return b;
}
// chip con nombre (C, detalle de un dia)
function chip(x,iso,h,repinta,forzar){
  var auto=x.regla.tipo==="auto", tocable = auto ? (forzar && puedeForzar(x,iso,h)) : puedeMarcar(x,iso,h);
  var b=el(auto && !tocable ? "span" : "button","arcChip"+(auto?" auto":"")+(x.ok?" on":""),
    ico(x.ok ? "check-circle" : icoRegla(x.regla))+'<span>'+esc(x.regla.nombre)+(auto || x.como==="dato" || x.ok===null ? " · "+esc(estadoTxt(x,iso,h)) : "")+'</span>');
  b.setAttribute("aria-label",etiquetaCk(x,iso,h,forzar));
  if(auto && !tocable){ b.setAttribute("role","img"); return b; }
  b.setAttribute("aria-pressed",x.ok?"true":"false");
  if(!tocable) b.disabled=true;
  else b.addEventListener("click",function(){ toca(x,iso,repinta); });
  return b;
}
// anillo: la parte hecha de una regla (el plan puede ir 1 de 2)
function anillo(x){
  var pct = x.ok ? 1 : (x.plan && x.plan.s ? x.plan.h/x.plan.s : 0), C=2*Math.PI*19;
  return '<svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle class="pista" cx="24" cy="24" r="19" fill="none" stroke-width="4"/>'+
    (pct>0 ? '<circle class="arco" cx="24" cy="24" r="19" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="'+(pct*C).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 24 24)"/>' : '')+
    '<g transform="translate(14 14) scale(.078)">'+'<path fill="currentColor" d="'+(PH[x.ok?"check":icoRegla(x.regla)]||PH.circle)+'"/></g></svg>';
}
function anillos(e,iso,h,repinta,grande,forzar){
  var w=el("div","arcAn"+(grande?" grande":""));
  e.reglas.forEach(function(x){
    var tocable = x.regla.tipo==="auto" ? (forzar && puedeForzar(x,iso,h)) : puedeMarcar(x,iso,h);
    var it=el(tocable?"button":"div","",anillo(x)+'<small>'+esc(x.regla.nombre)+'</small>'+
      (grande ? '<small class="arcAnEst">'+esc(estadoTxt(x,iso,h))+'</small>' : ''));
    it.setAttribute("aria-label",etiquetaCk(x,iso,h,forzar));
    if(tocable){ it.setAttribute("aria-pressed",x.ok?"true":"false"); it.addEventListener("click",function(){ toca(x,iso,repinta); }); }
    else it.setAttribute("role","img");
    w.appendChild(it);
  });
  return w;
}
// punto de un dia (C): relleno segun las reglas cumplidas
function punto(e,iso,h){
  var C=2*Math.PI*8, fut=iso>h, s='<svg class="dot'+(fut?' fut':'')+'" viewBox="0 0 22 22" aria-hidden="true">';
  if(e.estado==="cumplido") s+='<circle class="lleno" cx="11" cy="11" r="8"/>';
  else{
    s+='<circle class="pista" cx="11" cy="11" r="8"/>';
    if(!fut && e.pct>0) s+='<circle class="arco" cx="11" cy="11" r="8" stroke-dasharray="'+(e.pct*C).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 11 11)"/>';
  }
  if(iso===h) s+='<circle class="hoy" cx="11" cy="11" r="10"/>';
  return s+'</svg>';
}
function textoDia(e){
  return e.estado==="cumplido" ? "cumplido"+(e.sinDatos ? " con lo que se sabe" : "") : e.estado==="fallado" ? "a medias, "+e.hechas+" de "+e.cuentan
       : e.estado==="hoy" ? "hoy, "+e.hechas+" de "+e.cuentan : e.estado==="futuro" ? "todavía no" : "sin datos";
}
function avisoFallos(iso,h){
  if(iso!==h || !enArc(h)) return null;
  var n=fallosSeguidos(S.D,h,ctx()); if(n<2) return null;
  var a=el("p","arcAviso",ico("warning-circle")+'<span>'+(n===2 ? "Dos" : n)+' días seguidos a medias: hoy toca volver. No se reinicia nada.</span>');
  a.setAttribute("role","status");
  return a;
}
function cabDia(e){ return "Día "+e.dia+"/"+TOTAL+" · Semana "+e.semana; }
function abre(desde){ return function(){ irRev = desde==="rev"; P.abre(); }; }

/* ------------------------------ lo de HOY ------------------------------
   vista(iso) -> { antes, tarjeta, despues, filas } segun el diseno. Antes y
   despues van encima y debajo de la tarjeta del dia; "tarjeta" va dentro
   de ella; "filas" son filas de la linea del dia (B).                    */
function vista(iso){
  if(!P || !S) return {};
  var h=hoy(), D=S.D, d=diseno();
  if(!enArc(iso)) return {};
  function rep(){ if(P.repinta) P.repinta(); }
  // sin reglas: una fila igual en los cuatro disenos, que lleva a ponerlas
  if(!D.reglas.length){
    var b=el("section","arcV arcBloque");
    var txt = editable(h) ? "Sin reglas. Pon de "+MIN_REGLAS+" a "+MAX_REGLAS+" antes del 1 de octubre." : "Sin reglas: el Arc no tiene nada que contar.";
    var ab=el("button","arcAbre",'<span><span class="arcL">Arc · '+esc(cabDia(estadoDia(D,iso,h,ctx())))+'</span>'+
      '<span class="arcT" style="display:block;margin-top:4px">'+esc(txt)+'</span></span>'+ico("caret-right"));
    ab.style.minHeight="64px"; ab.addEventListener("click",abre()); b.appendChild(ab);
    return { despues:b };
  }
  var e=estadoDia(D,iso,h,ctx()), o={};
  if(d==="A"){
    var a=el("section","arcV arcBloque arcHoyA"), cab=el("button","arcAbre",'<span class="arcL">'+esc(lineaEtapa(D,iso,h) || cabDia(e))+'</span>'+ico("caret-right"));
    cab.addEventListener("click",abre()); a.appendChild(cab);
    a.appendChild(anillos(e,iso,h,rep,false));
    var fa=avisoFallos(iso,h); if(fa) a.appendChild(fa);
    var ea2=el("div"); avisosEstado(ea2); if(ea2.childNodes.length) a.appendChild(ea2);
    o.antes=a;
  }else if(d==="B"){
    var top=el("div","arcV arcBDia"), bb=el("button","arcAbre",'<span class="arcL">Arc · '+esc(cabDia(e))+'</span>'+ico("caret-right"));
    bb.addEventListener("click",abre()); top.appendChild(bb);
    var cont=el("div","arcV"); cont.appendChild(top);
    var fb=avisoFallos(iso,h); if(fb) cont.appendChild(fb);
    avisosEstado(cont);
    o.despues=cont;
    o.filas=e.reglas.map(function(x){
      var li=el("li","linIt arcB arcV");
      li.appendChild(el("time","",esc(x.regla.ancla||"")));
      var pto=el("div","linPto"); pto.appendChild(check(x,iso,h,rep)); li.appendChild(pto);
      li.appendChild(el("div","linCu",'<div class="linCab"><span><em>Arc'+(x.regla.tipo==="auto"?" · automática":"")+'</em><b>'+esc(x.regla.nombre)+'</b>'+
        '<small>'+esc(estadoTxt(x,iso,h))+(x.regla.ayuda && !x.ok ? " · "+esc(x.regla.ayuda) : "")+'</small></span></div>'));
      return { h:x.regla.ancla||"23:59", nodo:li };
    });
  }else if(d==="C"){
    var c=el("section","arcV arcBloque arcC");
    var R=resumen(D,h,ctx());
    var cc=el("button","arcAbre",'<span class="arcL">'+esc(cabDia(e))+'</span><b>'+plural(R.cumplidos,"día cumplido","días cumplidos")+'</b>'+ico("caret-right"));
    cc.setAttribute("aria-label","Arc, "+cabDia(e)+", "+plural(R.cumplidos,"día cumplido","días cumplidos")+". Abrir Arc");
    cc.addEventListener("click",abre()); c.appendChild(cc);
    c.appendChild(semana(iso,h));
    var ch=el("div","arcChips"); e.reglas.forEach(function(x){ ch.appendChild(chip(x,iso,h,rep)); }); c.appendChild(ch);
    var fc=avisoFallos(iso,h); if(fc) c.appendChild(fc);
    avisosEstado(c);
    o.antes=c;
    var sem=semanaDe(iso);
    if(sem && sem.hasta===iso && iso<=h){                    // domingo: la revision es una tarjeta
      var rv=revision(D,h,ctx()).filter(function(s){ return s.n===sem.n; })[0], t=el("section","arcV arcRevTj");
      t.appendChild(el("h3","arcL","Revisión · Semana "+sem.n));
      t.appendChild(el("p","arcT",rv.cumplidos+" de "+rv.dias+" días cumplidos"));
      if(rv.nota) t.appendChild(el("p","arcS",esc(rv.nota)));
      var bt=el("button","arcBot2",rv.nota ? "Ver la revisión" : "Escribir la revisión"); bt.addEventListener("click",abre("rev")); t.appendChild(bt);
      o.despues=t;
    }
  }else{                                                     // D
    var dd=el("section","arcV arcBloque arcD");
    var db=el("button","arcAbre",'<span><span class="arcL">Arc</span><span class="arcT" style="display:block">'+esc(cabDia(e).split(" · ")[0])+'</span></span>'+ico("caret-right"));
    db.addEventListener("click",abre()); dd.appendChild(db);
    var ck=el("div","arcCks"); e.reglas.forEach(function(x){ ck.appendChild(check(x,iso,h,rep)); }); dd.appendChild(ck);
    var w=el("div","arcV"); w.appendChild(dd);
    var fd=avisoFallos(iso,h); if(fd){ fd.style.margin="-4px 16px 12px"; w.appendChild(fd); }
    var ed=el("div"); ed.style.margin="-4px 16px 12px"; avisosEstado(ed); if(ed.childNodes.length) w.appendChild(ed);
    o.despues=w;
  }
  return o;
}
// la semana (lunes a domingo) del dia, en 7 puntos
function semana(iso,h){
  var w=el("div","arcSem"), lun=mas(iso,-diaSem(iso)), L=["L","M","X","J","V","S","D"];
  for(var k=0;k<7;k++){
    var d=mas(lun,k), dentro=enArc(d), e=dentro ? estadoDia(S.D,d,h,ctx()) : null;
    var it=el(P.irA && dentro ? "button" : "div","", '<i>'+L[k]+'</i>'+(e ? punto(e,d,h) : '<svg viewBox="0 0 22 22" aria-hidden="true"></svg>'));
    it.setAttribute("aria-label",larga(d)+": "+(e ? textoDia(e) : "fuera del Arc"));
    if(P.irA && dentro) (function(dd){ it.addEventListener("click",function(){ P.irA(dd); }); })(d);
    w.appendChild(it);
  }
  return w;
}

/* ----------------------------- la pantalla ----------------------------- */
function seccion(w,tit,id){ var s=el("section"); if(id) s.id=id; s.appendChild(el("h3","arcL",esc(tit))); w.appendChild(s); return s; }
function barras(por){
  var w=el("div");
  por.forEach(function(p){
    w.appendChild(el("div","arcBar",'<span>'+esc(p.regla.nombre)+'</span><em>'+(p.pct==null ? "sin días todavía" : p.ok+"/"+p.total+" · "+p.pct+" %")+'</em>'+
      '<div><i style="width:'+(p.pct||0)+'%"></i></div>'));
  });
  return w;
}
function num(n,dec){ return (dec ? n.toFixed(dec) : String(Math.round(n))).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,"."); }
function signo(n){ return n>0 ? "+"+n : String(n); }
// la curva de la fuerza (en el color del texto: el acento es solo "hecho")
function curva(serie,desde){
  var S2=serie.filter(function(s){ return s.d>=desde; });
  if(S2.length<2) return "";
  var W=320, H=64, n=TOTAL-1, x0=entre(desde,S2[0].d), X=function(d){ return entre(INICIO,d)/n*W; };
  var pts=S2.map(function(s,i){ return ((x0+i)/Math.max(n,1)*W).toFixed(1)+","+(H-2-s.v/100*(H-4)).toFixed(1); }).join(" ");
  var sep="", L=ordenEtapas(S.D.etapas||[]);
  L.slice(0,-1).forEach(function(e){ var x=X(e.hasta).toFixed(1); sep+='<line class="sep" x1="'+x+'" y1="0" x2="'+x+'" y2="'+(H-2)+'"/>'; });
  var num=L.map(function(e,i){ return '<span class="arcL" style="left:'+((X(e.desde)+X(e.hasta))/2/W*100).toFixed(1)+'%">'+romano(i+1)+'</span>'; }).join("");
  return '<svg class="arcCurva" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'+sep+
    '<line x1="0" y1="'+(H-2)+'" x2="'+W+'" y2="'+(H-2)+'"/><polyline points="'+pts+'"/></svg><div class="arcCurvaEt">'+num+'</div>';
}
function pintaFuerza(w,F,h){
  var s=seccion(w,"Fuerza del Arc"), d7=F.arc-F.hace7;
  s.appendChild(el("div","arcCont",'<span class="arcN">'+F.arc+' %</span><span class="arcT">'+(d7 ? signo(d7)+" en 7 días" : "igual que hace 7 días")+'</span>'));
  s.appendChild(el("p","arcS","Sube cada día que cumples y baja poco en un día a medias: nunca vuelve a cero. Los días sin datos no la mueven."));
  var cv=curva(F.serie, INICIO); if(cv) s.appendChild(el("div","arcCurvaW",cv));
  var cj=el("div","arcCaja"); cj.style.marginTop="12px";
  F.porRegla.forEach(function(p){
    cj.appendChild(el("div","arcBar",'<span>'+esc(p.regla.nombre)+'</span><em>'+p.v+" %"+(p.v!==p.hace7 ? " · "+signo(p.v-p.hace7)+" en 7 días" : "")+'</em>'+
      '<div><i style="width:'+p.v+'%"></i></div>'));
  });
  s.appendChild(cj);
}
function pintaHoy(w,h,repinta){
  var e=estadoDia(S.D,h,h,ctx()), s=seccion(w,"Hoy · "+cabDia(e));
  s.appendChild(el("p","arcT",e.estado==="cumplido" ? "Día cerrado: un voto más por quien quieres ser." : e.hechas+" de "+e.cuentan+" hechas. Cada día cumplido es un voto."));
  var cj=el("div","arcCaja"); cj.style.marginTop="12px"; cj.appendChild(anillos(e,h,h,repinta,true)); s.appendChild(cj);
  var fa=avisoFallos(h,h); if(fa) s.appendChild(fa);
}
// lo que llevas: numeros de Strava y Hevy, y frente a septiembre por semana
function pintaLlevas(w,h,k){
  var ult=h<FIN?h:FIN, t=totales(k.acts,INICIO,ult), pl=planTotal(S.D,INICIO,ult,h,k);
  var s=seccion(w,"Lo que llevas desde el 1 de septiembre");
  if(!t.sesiones && !pl.s){
    s.appendChild(el("p","arcS", estadoActs()==="cargando" ? "Trayendo Strava y Hevy…" : "Todavía no hay entrenos de Strava ni de Hevy en estas fechas."));
    return;
  }
  var g=el("div","arcCaja arcTiles");
  function tile(v,u){ g.appendChild(el("div","",'<b class="arcN">'+v+'</b><span class="arcS">'+esc(u)+'</span>')); }
  tile(num(t.km,t.km<100?1:0),"km corridos");
  tile(num(t.horas,1),"horas de entreno");
  tile(num(t.kg),"kg movidos en Hevy");
  tile(pl.s ? pl.h+"/"+pl.s : "–","sesiones del plan");
  s.appendChild(g);
}
// la temporada: 13 semanas en filas (la 1 ocupa dos, del jueves 1 al domingo 11) y 7 dias en columnas

// el sueño: lo que dice Huawei, con su fecha. Sin inventar noches que no hay
function pintaSueno(w,h,repinta){
  var s=seccion(w,"Sueño");
  if(!SALUD){
    s.appendChild(el("p","arcS","Todavía no hay datos de Huawei Health en este móvil. Con ellos, «Dormir 7 h o más» se marca solo y ves a qué hora te acuestas."));
    botonSalud(s,repinta); return;
  }
  var hasta = SALUD.hasta<h ? SALUD.hasta : h, zA=suenoDe(SALUD.dias,INICIO,hasta);
  var noches=Object.keys(SALUD.dias).filter(function(d){ return d>=INICIO && d<=hasta && typeof SALUD.dias[d].sueno==="number"; }).sort();
  var z7=suenoDe(SALUD.dias, noches.length ? noches[Math.max(0,noches.length-7)] : hasta, hasta);
  if(!zA.noches){ s.appendChild(el("p","arcS","El fichero importado no trae noches del Arc todavía.")); return; }
  var g=el("div","arcCaja arcTiles");
  function tile(v,u){ g.appendChild(el("div","",'<b class="arcN">'+v+'</b><span class="arcS">'+esc(u)+'</span>')); }
  tile(z7.media ? horasTxt(z7.media) : "–","de media, últimas "+plural(z7.noches,"noche"));
  tile(zA.conSiete+"/"+zA.noches,"noches de 7 h o más en el Arc");
  tile(z7.acuesta||"–","te acuestas, de media");
  tile(z7.levanta||"–","te levantas, de media");
  s.appendChild(g);
  var atras=entre(SALUD.hasta,h);
  s.appendChild(el("p","arcS","Datos de "+esc(SALUD.fuente||"Huawei Health")+" hasta el "+esc(larga(SALUD.hasta))+"."+
    (atras>7 ? " Faltan "+plural(atras,"noche")+": importa el siguiente fichero." : "")));
  botonSalud(s,repinta);
}
// importar el fichero de Huawei (el de scripts/salud-arc.mjs); cada uno suma los dias que traiga
var msgSalud="";
function botonSalud(s,repinta){
  if(S.soloLectura) return;
  var inp=el("input"); inp.type="file"; inp.accept="application/json,.json"; inp.id="arcSaludF"; inp.hidden=true;
  var b=el("button","arcBot2",SALUD ? "Importar el fichero nuevo" : "Importar el fichero de Huawei");
  b.addEventListener("click",function(){ inp.click(); });
  inp.addEventListener("change",function(){
    var f=inp.files && inp.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(){
      var L=leeSalud(String(r.result||""));
      if(L.error){ msgSalud=L.error; repinta(); return; }
      var nuevo=mezclaSalud(SALUD,L);
      if(!guardaSalud(P.almacen,nuevo)){ msgSalud="No se ha podido guardar: el móvil no deja o está lleno."; repinta(); return; }
      SALUD=nuevo; msgSalud=""; registra(); repinta();
    };
    r.onerror=function(){ msgSalud="No se ha podido leer el fichero."; repinta(); };
    r.readAsText(f);
  });
  s.appendChild(inp); s.appendChild(b);
  if(msgSalud){ var m=el("p","arcAviso arcMal",ico("warning-circle")+'<span>'+esc(msgSalud)+'</span>'); m.setAttribute("role","alert"); s.appendChild(m); }
}
function pinta(c){
  if(!P || !S){ c.innerHTML='<p class="arcS">Arc no ha arrancado. Cierra la app y vuelve a abrirla.</p>'; return; }
  var sc=c.scrollTop, h=hoy(), D=S.D, k=ctx();
  c.innerHTML=""; var w=el("div","arcV"); w.id="arcP"; c.appendChild(w);
  function repinta(){ pinta(c); }
  var est=el("div"); avisosEstado(est); if(est.childNodes.length){ var se=el("section"); se.appendChild(est); w.appendChild(se); }
  var F = D.reglas.length ? fuerzas(D,h,k) : { arc:0, hace7:0, serie:[], porRegla:[], en:function(){ return 0; } };
  pintaEtapaActual(w,h,F);
  verObjetivo(w);
  if(!D.reglas.length){
    var sv=seccion(w,"Reglas"); sv.appendChild(el("div","arcCaja arcVacio",'<p class="arcT">Sin reglas</p><p class="arcS">'+
      (editable(h) ? "Hacen falta de "+MIN_REGLAS+" a "+MAX_REGLAS+". Se ponen con el engranaje de arriba hasta el 30 de septiembre."
                   : "El Arc siguió sin reglas, así que no hay nada que contar.")+'</p>'));
  }else{
    pintaFuerza(w,F,h);
    pintaSueno(w,h,repinta);
    pintaLlevas(w,h,k);
    pintaRecorrido(w,h,F);
  }
  c.scrollTop=sc;
  if(irRev){ irRev=false; var r=document.getElementById("arcRev"); if(r) r.scrollIntoView(); }
}
// la barra de todas las etapas: cada una a su tamano, la actual rellena hasta hoy
// en Ajustes del Arc: nombre y fechas de cada etapa; se guarda al cambiar
/* ------------------------- la hoja de ruta (vista) -------------------------
   Arriba de Winter Arc: la etapa en curso con su miliario (la cuenta atras
   al siguiente destino real), su tira de dias y lo que pide. Abajo, la Hoja
   de ruta: las etapas con numeral romano, una espina que se rellena al
   sellarlas y el acta de cada una. El ambar solo va en la tira de arriba (lo
   cumplido) y en los checks de Hoy; lo demas, en tinta.                    */
var DIAS_C=["lun","mar","mié","jue","vie","sáb","dom"];
function diaCorto(iso){ return DIAS_C[diaSem(iso)]+" "+corta(iso); }
function icoSvg(n,x,y,t,cls){ if(PROPIOS[n]) return '<svg class="'+(cls||"")+'" x="'+x.toFixed(1)+'" y="'+y+'" width="'+t+'" height="'+t+'" viewBox="0 0 256 256">'+PROPIOS[n]+'</svg>';
  return '<svg class="'+(cls||"")+'" x="'+x.toFixed(1)+'" y="'+y+'" width="'+t+'" height="'+t+'" viewBox="0 0 256 256"><path fill="currentColor" d="'+(PH[n]||PH.circle)+'"/></svg>'; }
var tramoAbierto=null, actaDe=null;
// los iconos de viaje de una etapa: uno por destino (su monumento), carrera y sello
function marcasViaje(e){
  var M=[], T=viajesDe(S.D).filter(function(v){ return v.fecha; });
  T.forEach(function(v,i){
    if(v.fecha<e.desde || v.fecha>e.hasta) return;
    var ant=T[i-1];
    if(v.a==="Madrid" || (ant && ant.de===v.a && ant.fecha===v.fecha)) return;   // vuelta a casa o la vuelta del mismo dia
    M.push({ d:v.fecha, icono:iconoViaje(v), pri:1, posible:!!v.posible, v:v });
  });
  if(CARRERA.fecha>=e.desde && CARRERA.fecha<=e.hasta) M.push({ d:CARRERA.fecha, icono:"flag-checkered", pri:3, tinta:true });
  if(e.hasta===FIN) M.push({ d:FIN, icono:"seal-check", pri:2, tinta:true });
  return M;
}
// estancias fuera de casa: de la ida desde Madrid a la vuelta a Madrid
function estancias(e){
  var V=viajesDe(S.D).filter(function(v){ return v.fecha; }), R=[];
  V.forEach(function(v,i){
    if(v.de!=="Madrid" || v.a==="Madrid") return;
    if(v.posible) return;                                       // un viaje posible no pinta estancia
    var vuelta=null; for(var j=i+1;j<V.length;j++) if(V[j].a==="Madrid"){ vuelta=V[j]; break; }
    var hasta = vuelta ? (vuelta.llega||vuelta.fecha) : null;
    if(v.fecha>e.hasta || (hasta && hasta<e.desde)) return;
    R.push({ desde:v.fecha, hasta:hasta, posible:!!v.posible });
  });
  return R;
}
/* La tira: un dia = una marca. W de ancho; alto 56 (grande) o 28 (corta).
   tinta: lo cumplido en --fg en vez de ambar (actas y Hoja de ruta).       */
function tira(e,h,W,grande,tinta){
  var k=ctx(), N=entre(e.desde,e.hasta)+1, p=W/N, tw=Math.max(3,Math.min(6,p*0.5)), H=grande?56:28, base=grande?48:22, alto=grande?20:14;
  var s='<svg class="arcTira'+(grande?'':' corta')+'" viewBox="0 0 '+W.toFixed(1)+' '+H+'" width="'+W.toFixed(1)+'" height="'+H+'" aria-hidden="true">';
  s+='<line class="base" x1="0" y1="'+(base+0.5)+'" x2="'+W.toFixed(1)+'" y2="'+(base+0.5)+'"/>';
  var xs=function(d){ return entre(e.desde,d)*p+p/2; };
  if(grande){                                           // estancias fuera de casa
    estancias(e).forEach(function(t){
      var a=Math.max(0,xs(t.desde<e.desde?e.desde:t.desde)), b = t.hasta && t.hasta<=e.hasta ? xs(t.hasta) : W;
      s+='<line class="estancia'+(t.posible?' posible':'')+'" x1="'+a.toFixed(1)+'" y1="24" x2="'+b.toFixed(1)+'" y2="24"/>';
    });
  }
  for(var i=0;i<N;i++){
    var d=mas(e.desde,i), x=i*p+(p-tw)/2;
    if(d>h){ s+='<circle class="fut" cx="'+(i*p+p/2).toFixed(1)+'" cy="'+(base-1.5)+'" r="'+(grande?1.25:1)+'"/>'; continue; }
    var st=estadoDia(S.D,d,h,k), hh, cls;
    if(st.estado==="cumplido"){ hh=alto; cls=tinta?"tinta":"hecho"; }
    else if(st.hechas>0){ hh=3+(alto-3)*st.pct; cls="medio"; }
    else { hh=3; cls="nada"; }
    if(d===h){
      s+='<rect class="hoyC" x="'+x.toFixed(2)+'" y="'+(base-alto)+'" width="'+tw.toFixed(2)+'" height="'+alto+'" rx="1"/>';
      if(st.estado!=="cumplido" && st.hechas>0) s+='<rect class="medio" x="'+x.toFixed(2)+'" y="'+(base-hh).toFixed(1)+'" width="'+tw.toFixed(2)+'" height="'+hh.toFixed(1)+'" rx="1"/>';
      if(st.estado==="cumplido") s+='<rect class="'+cls+'" x="'+x.toFixed(2)+'" y="'+(base-alto)+'" width="'+tw.toFixed(2)+'" height="'+alto+'" rx="1"/>';
      if(grande) s+='<line class="hoyL" x1="'+(i*p+p/2).toFixed(1)+'" y1="24" x2="'+(i*p+p/2).toFixed(1)+'" y2="'+(base-alto)+'"/>';
      continue;
    }
    s+='<rect class="'+cls+'" x="'+x.toFixed(2)+'" y="'+(base-hh).toFixed(1)+'" width="'+tw.toFixed(2)+'" height="'+hh.toFixed(1)+'" rx="1"/>';
  }
  // viajes: icono (grande) o muesca (corta). Dos a menos de 22 px: gana la prioridad
  var M=marcasViaje(e).sort(function(a,b){ return b.pri-a.pri; }), puestos=[];
  M.forEach(function(m){
    var cx=xs(m.d);
    if(grande){
      if(puestos.some(function(q){ return Math.abs(q-cx)<22; })) return;
      puestos.push(cx);
      s+=icoSvg(m.icono,Math.max(0,Math.min(W-20,cx-10)),3,20,m.tinta?"vT":"vM");
    }else s+='<rect class="'+(m.tinta?"muescaT":"muesca")+'" x="'+(cx-(m.tinta?1:0.5)).toFixed(1)+'" y="'+(base+2)+'" width="'+(m.tinta?2:1)+'" height="5"/>';
  });
  return s+'</svg>';
}
// la etapa en curso, arriba del todo
function pintaEtapaActual(w,h,F){
  var s=el("section","arcEtapa");
  if(h>FIN){                                             // el Arc ya se sello
    var R=resumen(S.D,h,ctx());
    s.appendChild(el("p","arcL","Winter Arc · sellado"));
    s.appendChild(el("p","arcN arcEtNom",plural(R.cumplidos,"día cumplido","días cumplidos")));
    s.appendChild(el("p","arcS","122 días · del 1 sep al 31 dic"));
    w.appendChild(s); return;
  }
  var x=etapaDe(S.D,h); if(!x) return;
  w.appendChild(s);
  var e=x.etapa, k=ctx(), st=statsEtapa(S.D,e,h,k,F), des=destinoDe(S.D,e,h), L=ordenEtapas(S.D.etapas);
  // los 3 primeros dias de una etapa nueva: la anterior, sellada
  if(x.n>1 && entre(e.desde,h)<3){
    var ant=L[x.n-2], sa=statsEtapa(S.D,ant,h,k,F);
    var b=el("button","arcSello",ico("seal-check")+'<span>'+esc(ant.nombre)+', sellada: '+plural(sa.cumplidos,"día cumplido","días cumplidos")+'</span>');
    b.addEventListener("click",function(){ tramoAbierto=ant.id; var r=document.getElementById("arcRuta"); if(r) r.scrollIntoView(); pinta(document.getElementById("ptCuerpo")); });
    s.appendChild(b);
  }
  s.appendChild(el("div","arcEtCab",'<span class="arcL">'+ico(e.icono||"path")+'Etapa '+romano(x.n)+' de '+romano(x.total)+'</span>'+
    '<span class="arcL">Día '+st.llevas+' de '+st.dias+'</span>'));
  var cu=el("div","arcEtCuerpo");
  cu.appendChild(el("div","",'<h2 class="arcN arcEtNom">'+esc(e.nombre)+'</h2>'+(e.sub ? '<p class="arcT arcEtSub">'+esc(e.sub)+'</p>' : '')));
  var mil=el("div","arcMil", des.n===0
    ? ico(des.icono)+'<span class="arcL">'+esc(des.cero[0])+'<br>'+esc(des.cero[1])+'</span>'
    : '<b>'+des.n+'</b><span class="arcL">'+esc(des.arriba)+'<br>'+esc(des.abajo)+'</span>');
  mil.setAttribute("role","img"); mil.setAttribute("aria-label",mayus(des.frase));
  cu.appendChild(mil); s.appendChild(cu);
  // la tira de la etapa, con sus etiquetas
  var t=el("div","arcTiraW"), prox=proxima(e,h);
  t.innerHTML=tira(e,h,358,true,false);
  t.setAttribute("role","img");
  t.setAttribute("aria-label",e.nombre+": día "+st.llevas+" de "+st.dias+", "+plural(st.cumplidos,"día cumplido","días cumplidos")+
    (prox ? ". Próxima parada: "+prox.nombre+", "+larga(prox.fecha) : "")+".");
  var N=st.dias, px=(entre(e.desde,h)+0.5)/N*100, et=el("div","arcTiraEt");
  var der = CARRERA.fecha>=e.desde && CARRERA.fecha<=e.hasta ? CARRERA.ciudad+" · "+corta(CARRERA.fecha) : corta(e.hasta);
  if(px>12) et.appendChild(el("span","arcL izq",corta(e.desde)));
  if(px<80) et.appendChild(el("span","arcL der",esc(der)));
  var hy=el("span","arcL hoy","Hoy"); hy.style.left=px.toFixed(1)+"%"; et.appendChild(hy);
  t.appendChild(et); s.appendChild(t);
  if(prox){
    s.appendChild(el("div","arcProx",ico(prox.icono)+'<span><span class="arcT">'+esc(prox.nombre)+'</span><span class="arcS">'+esc(prox.fechas)+'</span></span>'+
      '<span class="arcL">'+(prox.n===0 ? "Hoy" : prox.n===1 ? "Mañana" : "En "+prox.n+" días")+'</span>'));
  }
  pintaPide(w,e,h,k,F,st);
}
// la proxima parada: el primer viaje de aqui al final de la etapa; si no, el destino
function proxima(e,h){
  var V=viajesDe(S.D).filter(function(v){ return v.fecha && v.fecha>=h && v.fecha<=e.hasta && v.a!=="Madrid" && (!v.de || v.de==="Madrid"); });
  if(V.length){
    var v=V[0], vuelta=viajesDe(S.D).filter(function(u){ return u.fecha && u.fecha>v.fecha && u.a==="Madrid"; })[0];
    var fin = vuelta ? (vuelta.llega||vuelta.fecha) : null;
    return { nombre:v.a+(v.posible?" · posible":""), fecha:v.fecha, n:entre(h,v.fecha), icono:iconoViaje(v),
             fechas: fin ? diaCorto(v.fecha).replace(/ \w+$/,"")+" – "+diaCorto(fin) : diaCorto(v.fecha) };
  }
  if(CARRERA.fecha>=h && CARRERA.fecha>=e.desde && CARRERA.fecha<=e.hasta)
    return { nombre:CARRERA.texto, fecha:CARRERA.fecha, n:entre(h,CARRERA.fecha), icono:"flag-checkered", fechas:diaCorto(CARRERA.fecha) };
  return null;
}
// lo que pide la etapa: su consigna y sus numeros reales (lo que no hay, no sale)
function filaPide(cj,et,val,pct){
  var f=el("div","arcPideF",'<span class="arcS">'+esc(et)+'</span><b class="arcT">'+esc(val)+'</b>');
  if(pct!=null) f.appendChild(el("div","arcBarra",'<i style="width:'+Math.max(0,Math.min(100,pct)).toFixed(0)+'%"></i>'));
  cj.appendChild(f);
}
function pintaPide(w,e,h,k,F,st){
  var cons=CONSIGNAS[e.id], cj=el("div","arcCaja arcPide"), s=el("section"); s.appendChild(cj);
  cj.appendChild(el("p","arcL","Lo que pide "+esc(e.nombre)));
  if(cons) cj.appendChild(el("p","arcT arcPideC",esc(cons)));
  var ult=h<e.hasta?h:e.hasta, n0=cj.childNodes.length;
  if(e.id==="e4"){
    var z=suenoDe(k.salud,e.desde,ult);
    if(z.noches) filaPide(cj,"Noches de 7 h o más",z.conSiete+" de "+z.noches,100*z.conSiete/z.noches);
    if(z.acuesta) filaPide(cj,"Hora media de acostarse",z.acuesta);
    if(!z.noches) cj.appendChild(el("p","arcS","Sale con los datos de Huawei de estas noches."));
  }else if(e.id==="e3"){
    var vo=volviste(S.D,e.desde,e.hasta,h,k);
    if(vo.f) filaPide(cj,"Volviste al día siguiente",vo.v+" de "+plural(vo.f,"vez","veces"),100*vo.v/vo.f);
    else if(st.contados) filaPide(cj,"Días a medias seguidos de otro","ninguno");
    var mx=cuenta(S.D,"2026-11-03"<e.desde?e.desde:"2026-11-03","2026-11-18"<e.hasta?"2026-11-18":e.hasta,h,k);
    if(mx.cumplidos) filaPide(cj,"Días cumplidos en México",String(mx.cumplidos));
  }else if(e.id==="e5"){
    var mxF=Math.max.apply(null,F.serie.map(function(x){ return x.v; }).concat([0]));
    filaPide(cj,"Fuerza · máx. del Arc "+mxF+" %",F.arc+" %",F.arc);
    var ks=kmSemana(k.acts,h);
    if(ks.sept || ks.ahora) filaPide(cj,"Km por semana, septiembre → ahora",num(ks.sept,1)+" → "+num(ks.ahora,1));
  }else{
    var pt=planTotal(S.D,e.desde,ult,h,k);
    if(pt.s) filaPide(cj,"Sesiones del plan",pt.h+" de "+pt.s,100*pt.h/pt.s);
    var km=totales(k.acts,INICIO,ult).km;
    if(km) filaPide(cj,"Km desde el 1 sep",num(km,km<100?1:0)+" km");
  }
  if(cj.childNodes.length===n0 && !cons){ return; }
  if(st.fuerzaAhora!=null) cj.appendChild(el("p","arcS arcPideU","Fuerza en la etapa: "+st.fuerzaIni+" → "+st.fuerzaAhora+" %"));
  if(estadoActs()==="cargando") cj.appendChild(el("p","arcS","Trayendo el calendario, Strava y Hevy…"));
  w.appendChild(s);
}
// la Hoja de ruta
function pintaRecorrido(w,h,F){
  var L=ordenEtapas(S.D.etapas||[]); if(!L.length) return;
  var k=ctx(), s=el("section","arcRuta"); s.id="arcRuta"; w.appendChild(s);
  s.appendChild(el("div","arcEtCab",'<h3 class="arcL">Hoja de ruta</h3><span class="arcL">'+corta(INICIO)+' – '+corta(FIN)+' · '+TOTAL+' días</span>'));
  var act=etapaDe(S.D,h);
  if(tramoAbierto===null) tramoAbierto = act ? act.etapa.id : "";
  var ol=el("ol","arcTramos"), P2=(358-44)/48;
  L.forEach(function(e,i){
    var st=statsEtapa(S.D,e,h,k,F), li=el("li","arcTramoLi "+(st.estado==="pasada"?"sellada":st.estado==="actual"?"actual":"futura"));
    var abierto=tramoAbierto===e.id;
    var der = st.estado==="pasada" ? ico("seal-check")+"Sellada" : st.estado==="actual" ? "Día "+st.llevas+" de "+st.dias : "En "+plural(st.empiezaEn,"día");
    var linea;
    if(st.estado==="futura") linea=plural(st.dias,"día")+(e.sub ? " · "+e.sub : "");
    else{
      var P3=[]; if(st.cumplidos) P3.push(plural(st.cumplidos,"cumplido","cumplidos"));
      if(st.fuerzaAhora!=null) P3.push("fuerza "+st.fuerzaIni+" → "+st.fuerzaAhora+" %");
      if(st.hecho && st.hecho.km>=0.5) P3.push(num(st.hecho.km,st.hecho.km<100?1:0)+" km");
      linea=P3.join(" · ")||"Sin días cerrados todavía";
    }
    var b=el("button","arcTramo",'<span class="arcNodo">'+romano(i+1)+'</span>'+
      '<span class="arcTramoN">'+ico(e.icono||"path")+'<span class="arcT">'+esc(e.nombre)+'</span></span>'+
      '<span class="arcL arcTramoD">'+der+'</span>'+
      '<span class="arcTramoT">'+tira(e,h,st.dias*P2,false,true)+'</span>'+
      '<span class="arcS arcTramoS">'+esc(linea)+'</span>');
    b.setAttribute("aria-expanded",abierto?"true":"false");
    b.setAttribute("aria-label",romano(i+1)+", "+e.nombre+". "+(st.estado==="pasada"?"Sellada":st.estado==="actual"?"En curso, día "+st.llevas+" de "+st.dias:"Empieza en "+plural(st.empiezaEn,"día"))+". "+linea);
    b.addEventListener("click",function(){ tramoAbierto = abierto ? "" : e.id; pinta(document.getElementById("ptCuerpo")); });
    li.appendChild(b);
    if(abierto){
      var dent=el("div","arcTramoDentro");
      if(st.estado==="pasada") acta(dent,e,i+1,h,F);
      else if(st.estado==="futura") futura(dent,e);
      rejillaEtapa(dent,e,h);                                 // el calendario de cada fase, no solo el de la actual
      li.appendChild(dent);
    }
    ol.appendChild(li);
  });
  s.appendChild(ol);
}
// la rejilla de la etapa en curso: tocar un dia abre su detalle
function rejillaEtapa(w,e,h){
  var k=ctx(), g=el("div","arcGrid"), Lt=["L","M","X","J","V","S","D"], i;
  if(!selDia || selDia<e.desde || selDia>e.hasta) selDia = (h>=e.desde && h<=e.hasta) ? h : e.desde;   // en otra fase, su primer día
  function deViaje(d){ return viajesDe(S.D).filter(function(v){ return v.fecha===d || v.llega===d; }); }
  for(i=0;i<7;i++) g.appendChild(el("i","",Lt[i]));
  var d=mas(e.desde,-diaSem(e.desde)), fin=mas(e.hasta,6-diaSem(e.hasta));
  for(;d<=fin;d=mas(d,1)){
    if(d<e.desde || d>e.hasta){ g.appendChild(el("span","fuera","")); continue; }
    var st=estadoDia(S.D,d,h,k), cls = d>h ? "futuro" : st.estado==="cumplido" ? "cumplido" : st.hechas>0 ? "medio" : "nada";
    var vj=deViaje(d);
    var b=el("button",cls+(d===h?" hoy":"")+(d===selDia?" sel":"")+(vj.length?" viaje":""),'<span>'+(+d.split("-")[2])+'</span>'+(cls==="medio" ? '<i style="width:'+(100*st.pct).toFixed(0)+'%"></i>' : '')+(vj.length ? '<em></em>' : ''));
    b.setAttribute("aria-label",larga(d)+": "+textoDia(st)+vj.map(function(v){ return ". "+(v.posible ? "Posible: " : "Viaje: ")+textoViaje(v); }).join(""));
    (function(dd){ b.addEventListener("click",function(){ selDia=dd; pinta(document.getElementById("ptCuerpo")); }); })(d);
    g.appendChild(b);
  }
  w.appendChild(g);
  if(selDia){
    var e2=estadoDia(S.D,selDia,h,k), dj=el("div","arcCaja"); dj.style.marginTop="12px";
    dj.appendChild(el("p","arcT",esc(mayus(larga(selDia)))));
    dj.appendChild(el("p","arcS",esc(cabDia(e2)+" · "+(selDia>h ? "todavía no ha llegado" : textoDia(e2)))));
    deViaje(selDia).forEach(function(v){
      dj.appendChild(el("div","arcViaje"+(v.posible?" posible":""),ico(iconoViaje(v))+
        '<span class="arcT">'+esc(textoViaje(v))+'</span><span class="arcS">'+(v.posible ? '<span class="arcL">Posible</span> ' : '')+esc(v.llega===selDia && v.fecha!==selDia ? "llega hoy" : "sale hoy")+'</span>'));
    });
    dj.appendChild(anillos(e2,selDia,h,function(){ pinta(document.getElementById("ptCuerpo")); },true,true));
    if(selDia<=h && e2.reglas.some(function(x){ return puedeForzar(x,selDia,h); }))
      dj.appendChild(el("p","arcS","¿Lo hiciste y no se grabó? Toca lo automático para marcarlo «hecho sin registrar»."));
    w.appendChild(dj);
  }
}
// una etapa por venir: su consigna y sus viajes
function futura(w,e){
  if(CONSIGNAS[e.id]) w.appendChild(el("p","arcT",esc(CONSIGNAS[e.id])));
  var V=viajesDe(S.D).filter(function(v){ return (v.fecha && v.fecha>=e.desde && v.fecha<=e.hasta) || (!v.fecha && e.id==="e3"); });
  V.forEach(function(v){
    var f=el("div","arcViaje"+(v.posible?" posible":""),ico(iconoViaje(v))+
      '<span class="arcT">'+esc(textoViaje(v))+'</span>'+
      '<span class="arcS">'+(v.posible ? '<span class="arcL">Posible</span> ' : '')+esc(v.fecha ? (v.llega ? "llega "+diaCorto(v.llega) : diaCorto(v.fecha)) : "sin fecha")+'</span>');
    w.appendChild(f);
  });

}
// el acta de una etapa sellada
function acta(w,e,n,h,F){
  var k=ctx(), st=statsEtapa(S.D,e,h,k,F), cj=el("div","arcCaja arcActa");
  cj.appendChild(el("div","arcEtCab",'<span class="arcL">Acta · '+romano(n)+' '+esc(e.nombre)+'</span><span class="arcL">'+corta(e.desde)+' – '+corta(e.hasta)+' · '+st.dias+' días</span>'));
  var g=el("div","arcCifras");
  function cifra(v,et,sub){ g.appendChild(el("div","",'<b class="arcN">'+v+'</b><span class="arcL">'+esc(et)+'</span>'+(sub?'<span class="arcS">'+esc(sub)+'</span>':''))); }
  if(st.cumplidos) cifra(st.cumplidos,"días cumplidos");
  if(st.fuerzaAhora!=null) cifra(st.fuerzaAhora+" %","fuerza al sellar","desde "+st.fuerzaIni+" %");
  if(st.hecho && st.hecho.km>=0.5) cifra(num(st.hecho.km,st.hecho.km<100?1:0),"km corridos");
  if(st.hecho && st.hecho.horas>=0.05) cifra(num(st.hecho.horas,1),"horas de entreno");
  if(st.hecho && st.hecho.kg) cifra(num(st.hecho.kg),"kg en Hevy");
  if(st.sueno && st.sueno.media) cifra(horasTxt(st.sueno.media),"sueño medio");
  cj.appendChild(g);
  var hito = e.id==="e1" ? { i:"sneaker-move", t:"Test de 20 km", d:"2026-09-27" } : e.id==="e2" ? { i:"flag-checkered", t:CARRERA.texto, d:CARRERA.fecha }
           : e.id==="e3" ? { i:"airplane-tilt", t:"Vuelta de México", d:"2026-11-18" } : e.id==="e4" ? { i:"torre-hercules", t:"A Coruña", d:"2026-12-19" } : null;
  if(hito){
    var hr=el("div","arcProx",ico(hito.i)+'<span><span class="arcT">'+esc(hito.t)+'</span></span><span class="arcS">'+esc(diaCorto(hito.d))+'</span>');
    cj.appendChild(hr);
    if(e.id==="e2"){                                      // lo que dice Strava de la carrera, si la hay
      var c=(k.acts||[]).filter(function(a){ return a.fecha===CARRERA.fecha && tipoAct(a)==="correr"; }).sort(function(a,b){ return (b.distancia||0)-(a.distancia||0); })[0];
      if(c) cj.appendChild(el("p","arcS",num((c.distancia||0)/1000,2)+" km · "+horasTxt(Math.round((c.mov||0)/60))));
    }
  }
  var vo=volviste(S.D,e.desde,e.hasta,h,k);
  if(st.contados) cj.appendChild(el("p","arcS", vo.f ? "Volviste al día siguiente "+vo.v+" de "+plural(vo.f,"vez","veces")+"." : "Nunca dejaste dos días seguidos a medias."));
  var t=el("div","arcTiraW"); t.innerHTML=tira(e,h,358,true,true); cj.appendChild(t);
  w.appendChild(cj);
}
// en Ajustes del Arc: nombre, subtitulo y fechas de cada etapa; se guarda al cambiar
var borradorEt=null, msgEt={};
function pintaEtapasAjustes(w,repinta){
  var s=seccion(w,"Etapas · "+(S.D.etapas||[]).length+" de "+MAX_ETAPAS);
  s.appendChild(el("p","arcS","Ordenan el Arc en capítulos. Puedes cambiarlas cuando quieras: no cambian lo que cuenta."));
  var cj=el("div","arcCaja"); cj.style.marginTop="12px";
  ordenEtapas(S.D.etapas||[]).forEach(function(e,i){
    var f=el("div","arcEtEd");
    var n=el("input"); n.type="text"; n.value=e.nombre; n.maxLength=MAX_ETAPA; n.setAttribute("aria-label","Nombre de la etapa "+romano(i+1));
    var su=el("input"); su.type="text"; su.value=e.sub||""; su.maxLength=MAX_SUB; su.setAttribute("aria-label","Subtítulo de la etapa "+romano(i+1)); su.className="arcSubIn";
    var d1=el("input","arcFecha"); d1.type="date"; d1.value=e.desde; d1.min=INICIO; d1.max=FIN; d1.setAttribute("aria-label","Empieza");
    var d2=el("input","arcFecha"); d2.type="date"; d2.value=e.hasta; d2.min=INICIO; d2.max=FIN; d2.setAttribute("aria-label","Acaba");
    function cambia(){
      var x=ponEtapa(S.D,e.id,{ nombre:n.value, sub:su.value, desde:d1.value, hasta:d2.value });
      if(x.error){ msgEt[e.id]=x.error; repinta(); return; }
      delete msgEt[e.id]; guarda(); repinta();
    }
    [n,su,d1,d2].forEach(function(x){ if(S.soloLectura) x.disabled=true; x.addEventListener("change",cambia); });
    var fe=el("div","arcEtFechas"); fe.appendChild(d1); fe.appendChild(el("span","arcS","a")); fe.appendChild(d2);
    var bb=el("button","arcIcoBtn",ico("trash")); bb.setAttribute("aria-label","Quitar "+e.nombre);
    bb.addEventListener("click",function(){ if(!borraEtapa(S.D,e.id).error){ guarda(); repinta(); } });
    if(S.soloLectura || (S.D.etapas||[]).length<=1) bb.disabled=true;
    var top=el("div","arcEtTop"); top.appendChild(el("span","arcNodo",romano(i+1))); top.appendChild(n); top.appendChild(bb);
    f.appendChild(top); f.appendChild(su); f.appendChild(fe);
    if(msgEt[e.id]){ var m=el("p","arcAviso arcMal",ico("warning-circle")+'<span>'+esc(msgEt[e.id])+'</span>'); m.setAttribute("role","alert"); f.appendChild(m); }
    cj.appendChild(f);
  });
  if(!S.soloLectura && (S.D.etapas||[]).length<MAX_ETAPAS){
    var b=borradorEt || (borradorEt={ nombre:"", desde:"", hasta:"" });
    var f2=el("div","arcEtEd");
    var lb=el("label","arcL","Etapa nueva"); lb.setAttribute("for","arcEtNom"); f2.appendChild(lb);
    var n2=el("input"); n2.type="text"; n2.id="arcEtNom"; n2.maxLength=MAX_ETAPA; n2.value=b.nombre;
    n2.addEventListener("input",function(){ b.nombre=n2.value; });
    var a1=el("input","arcFecha"); a1.type="date"; a1.value=b.desde; a1.min=INICIO; a1.max=FIN; a1.setAttribute("aria-label","Empieza");
    var a2=el("input","arcFecha"); a2.type="date"; a2.value=b.hasta; a2.min=INICIO; a2.max=FIN; a2.setAttribute("aria-label","Acaba");
    a1.addEventListener("change",function(){ b.desde=a1.value; }); a2.addEventListener("change",function(){ b.hasta=a2.value; });
    var fe2=el("div","arcEtFechas"); fe2.appendChild(a1); fe2.appendChild(el("span","arcS","a")); fe2.appendChild(a2);
    f2.appendChild(n2); f2.appendChild(fe2);
    if(msgEt.nueva){ var m2=el("p","arcAviso arcMal",ico("warning-circle")+'<span>'+esc(msgEt.nueva)+'</span>'); m2.setAttribute("role","alert"); f2.appendChild(m2); }
    var ok=el("button","arcBot","Añadir etapa");
    ok.addEventListener("click",function(){
      var x=anadeEtapa(S.D,b);
      if(x.error){ msgEt.nueva=x.error; repinta(); return; }
      delete msgEt.nueva; borradorEt=null; guarda(); repinta();
    });
    f2.appendChild(ok);
    cj.appendChild(f2);
  }
  s.appendChild(cj);
}
// en Ajustes del Arc: los viajes (la app no lee vuelos). Solo nombres de ciudad
var borradorV=null, msgV={};
function pintaViajesAjustes(w,repinta){
  var s=seccion(w,"Viajes · "+(S.D.viajes||[]).length);
  s.appendChild(el("p","arcS","Salen en la tira de cada etapa y en la próxima parada. Solo ciudades; los posibles van con línea discontinua."));
  var cj=el("div","arcCaja"); cj.style.marginTop="12px";
  function editor(v,id){
    var f=el("div","arcEtEd");
    var de=el("input"); de.type="text"; de.value=v.de||""; de.maxLength=40; de.setAttribute("aria-label","Desde");
    var a=el("input"); a.type="text"; a.value=v.a||""; a.maxLength=40; a.setAttribute("aria-label","A");
    var fe=el("input","arcFecha"); fe.type="date"; fe.value=v.fecha||""; fe.min=INICIO; fe.max=FIN; fe.setAttribute("aria-label","Fecha");
    var po=el("button","arcChip"+(v.posible?" on":""),ico(v.posible?"check-circle":"circle")+'<span>Posible</span>');
    po.setAttribute("aria-pressed",v.posible?"true":"false");
    var top=el("div","arcEtTop"); top.appendChild(de); top.appendChild(el("span","arcS","→")); top.appendChild(a);
    var bot=el("div","arcEtFechas"); bot.appendChild(fe); bot.appendChild(po);
    f.appendChild(top); f.appendChild(bot);
    return { f:f, de:de, a:a, fe:fe, po:po, bot:bot };
  }
  viajesDe(S.D).forEach(function(v){
    var ed=editor(v);
    function cambia(pos){
      var x=ponViaje(S.D,v.id,{ de:ed.de.value, a:ed.a.value, fecha:ed.fe.value, via:v.via, llega:v.llega, posible: pos==null ? !!v.posible : pos });
      if(x.error){ msgV[v.id]=x.error; repinta(); return; }
      delete msgV[v.id]; guarda(); repinta();
    }
    [ed.de,ed.a,ed.fe].forEach(function(x){ if(S.soloLectura) x.disabled=true; x.addEventListener("change",function(){ cambia(); }); });
    if(S.soloLectura) ed.po.disabled=true; else ed.po.addEventListener("click",function(){ cambia(!v.posible); });
    var bb=el("button","arcIcoBtn",ico("trash")); bb.setAttribute("aria-label","Quitar el viaje a "+v.a);
    if(S.soloLectura) bb.disabled=true; else bb.addEventListener("click",function(){ borraViaje(S.D,v.id); guarda(); repinta(); });
    ed.bot.appendChild(bb);
    if(v.via) ed.f.appendChild(el("p","arcS","Vía "+esc(v.via)+(v.llega ? " · llega el "+esc(diaCorto(v.llega)) : "")));
    if(msgV[v.id]){ var m=el("p","arcAviso arcMal",ico("warning-circle")+'<span>'+esc(msgV[v.id])+'</span>'); m.setAttribute("role","alert"); ed.f.appendChild(m); }
    cj.appendChild(ed.f);
  });
  if(!S.soloLectura){
    var b=borradorV || (borradorV={ de:"Madrid", a:"", fecha:"", posible:false });
    var ed=editor(b);
    ed.f.insertBefore(el("p","arcL","Viaje nuevo"),ed.f.firstChild);
    ed.de.addEventListener("input",function(){ b.de=ed.de.value; }); ed.a.addEventListener("input",function(){ b.a=ed.a.value; });
    ed.fe.addEventListener("change",function(){ b.fecha=ed.fe.value; });
    ed.po.addEventListener("click",function(){ b.posible=!b.posible; repinta(); });
    if(msgV.nuevo){ var m2=el("p","arcAviso arcMal",ico("warning-circle")+'<span>'+esc(msgV.nuevo)+'</span>'); m2.setAttribute("role","alert"); ed.f.appendChild(m2); }
    var ok=el("button","arcBot","Añadir viaje");
    ok.addEventListener("click",function(){
      var x=anadeViaje(S.D,b);
      if(x.error){ msgV.nuevo=x.error; repinta(); return; }
      delete msgV.nuevo; borradorV=null; guarda(); repinta();
    });
    ed.f.appendChild(ok);
    cj.appendChild(ed.f);
  }
  s.appendChild(cj);
}
function abreAjustes(){ if(P.ajustes) P.ajustes(); }
function verObjetivo(w){
  var o=String(S.D.objetivo||"").trim(); if(!o) return;
  var s=seccion(w,"Objetivo"); s.appendChild(el("p","arcT",esc(o)));
}

/* ------------------------- ajustes del Arc -------------------------
   Diseño primero (es lo que más se cambia), luego objetivo, reglas y
   las horas de la línea del día.                                     */
function pintaAjustes(c){
  if(!P || !S){ c.innerHTML='<p class="arcS">Arc no ha arrancado. Cierra la app y vuelve a abrirla.</p>'; return; }
  var sc=c.scrollTop, h=hoy();
  c.innerHTML=""; var w=el("div","arcV"); w.id="arcP"; c.appendChild(w);
  function repinta(){ pintaAjustes(c); }
  var err=textoError(); if(err){ var se=el("section"); se.appendChild(el("p","arcAviso arcMal",ico("warning-circle")+'<span>'+esc(err)+'</span>')); w.appendChild(se); }
  pintaDiseno(w,repinta);
  pintaObjetivo(w,h,repinta);
  pintaReglas(w,h,repinta);
  pintaSaludAjustes(w,repinta);
  pintaEtapasAjustes(w,repinta);
  pintaViajesAjustes(w,repinta);
  pintaHoras(w);
  c.scrollTop=sc;
}
function pintaHoras(w){
  if(!S.D.reglas.length) return;
  var s=seccion(w,"Horas en la línea del día");
  s.appendChild(el("p","arcS","Solo en el diseño B: a qué hora sale cada regla. No cambia lo que cuenta."));
  var cj=el("div","arcCaja"); cj.style.marginTop="12px";
  S.D.reglas.forEach(function(r){
    var f=el("div","arcFila");
    var inp=el("input","arcHora"); inp.type="time"; inp.value=r.ancla||""; inp.setAttribute("aria-label","Hora de "+r.nombre);
    if(S.soloLectura) inp.disabled=true;
    inp.addEventListener("change",function(){ if(!ponAncla(S.D,r.id,inp.value).error) guarda(); });
    f.appendChild(el("span","",'<span class="arcT">'+esc(r.nombre)+'</span>')); f.appendChild(inp);
    cj.appendChild(f);
  });
  s.appendChild(cj);
}

function pintaObjetivo(w,h,repinta){
  var s=seccion(w,"Objetivo"), D=S.D, ed=objetivoEditable(D,h) && !S.soloLectura;
  if(!ed){ s.appendChild(el("p","arcT",esc(D.objetivo))); return; }
  var t=el("textarea"); t.id="arcObj"; t.value=D.objetivo; t.maxLength=MAX_OBJETIVO; t.rows=2;
  t.setAttribute("aria-label","Objetivo del Arc");
  var tm=null;
  function fija(){ clearTimeout(tm); if(!ponObjetivo(S.D,t.value,hoy()).error) guarda(); }
  if(editable(h)) t.addEventListener("input",function(){ clearTimeout(tm); tm=setTimeout(fija,500); });
  t.addEventListener("blur",fija);
  s.appendChild(t);
  s.appendChild(el("p","arcS",!String(D.objetivo).trim() ? "Uno solo, en una frase. Se fija el 1 de octubre." : "Se fija el 1 de octubre."));
}
function pintaRevision(w,h,k){
  var L=revision(S.D,h,k).reverse();
  if(!L.length) return;
  var s=seccion(w,"Revisión semanal","arcRev"), ultCerrada=null;
  L.forEach(function(r){ if(r.abierta && !ultCerrada) ultCerrada=r.n; });
  L.forEach(function(r,i){
    // la de esta semana y la ultima cerrada, abiertas; las viejas, en una linea que se abre
    if(r.abierta && r.n!==ultCerrada && !revAbiertas[r.n]){
      var f=el("button","arcFila arcRevFila",'<span><span class="arcT">Semana '+r.n+' · '+corta(r.desde)+' – '+corta(r.hasta)+'</span>'+
        '<span class="arcS">'+r.cumplidos+' de '+r.dias+' días cumplidos'+(r.nota ? " · con nota" : "")+'</span></span>'+ico("caret-right"));
      f.setAttribute("aria-expanded","false");
      f.addEventListener("click",function(){ revAbiertas[r.n]=true; pinta(document.getElementById("ptCuerpo")); });
      s.appendChild(f); return;
    }
    var cj=el("div","arcCaja"); if(i) cj.style.marginTop="12px";
    cj.appendChild(el("p","arcT","Semana "+r.n+" · "+corta(r.desde)+" – "+corta(r.hasta)));
    if(!r.abierta){
      cj.appendChild(el("p","arcS","En curso: "+plural(r.cumplidos,"día cumplido","días cumplidos")+" de "+r.dias+". Se revisa el "+DIAS_L[diaSem(r.hasta)]+" "+corta(r.hasta)+"."));
      s.appendChild(cj); return;
    }
    cj.appendChild(el("p","arcS",r.cumplidos+" de "+r.dias+" días cumplidos"+(r.pasada ? "" : " · hoy toca revisarla")));
    var tw=totales(k.acts,r.desde,r.hasta), pw=planTotal(S.D,r.desde,r.hasta,h,k);
    if(tw.sesiones || pw.s) cj.appendChild(el("p","arcS",[tw.km ? num(tw.km,1)+" km" : "", tw.horas ? num(tw.horas,1)+" h de entreno" : "", pw.s ? "plan "+pw.h+"/"+pw.s : ""].filter(Boolean).join(" · ")));
    r.porRegla.forEach(function(p){ cj.appendChild(el("p","arcS",esc(p.regla.nombre)+": "+(p.pct==null?"–":p.ok+"/"+p.total))); });
    var id="arcNota"+r.n, lb=el("label","arcL","Qué cambias la semana que viene"); lb.setAttribute("for",id);
    var t=el("textarea"); t.id=id; t.value=r.nota; t.maxLength=500;
    if(S.soloLectura) t.disabled=true;
    var tm=null;
    t.addEventListener("input",function(){ clearTimeout(tm); tm=setTimeout(function(){ ponNota(S.D,r.n,t.value); guarda(); },400); });
    t.addEventListener("blur",function(){ clearTimeout(tm); ponNota(S.D,r.n,t.value); guarda(); });
    cj.appendChild(lb); cj.appendChild(t);
    s.appendChild(cj);
  });
}

function pintaReglas(w,h,repinta){
  var D=S.D, ed=editable(h) && !S.soloLectura, n=D.reglas.length;
  var s=seccion(w,"Reglas · "+n+" de "+MAX_REGLAS);
  s.appendChild(el("p","arcS",!ed ? "Bloqueadas desde el 1 de octubre."
    : n<MIN_REGLAS ? "Faltan "+plural(MIN_REGLAS-n,"regla")+" (mínimo "+MIN_REGLAS+"). Se bloquean el 1 de octubre."
    : "Se pueden cambiar hasta el 30 de septiembre."));
  var cj=el("div","arcCaja"); cj.style.marginTop="12px";
  if(!n) cj.appendChild(el("div","arcVacio",'<p class="arcT">Sin reglas</p><p class="arcS">Cada regla es un sí o un no de cada día. Añade la primera abajo.</p>'));
  D.reglas.forEach(function(r){
    var f=el("div","arcFila",ico(icoRegla(r))+'<span><span class="arcT">'+esc(r.nombre)+'</span><span class="arcS">'+esc(subRegla(r)+(r.ayuda ? " · "+r.ayuda : ""))+'</span></span>');
    if(ed){
      var be=el("button","arcIcoBtn",ico("pencil-simple")); be.setAttribute("aria-label","Cambiar "+r.nombre);
      be.addEventListener("click",function(){ editando=r.id; borrador={ nombre:r.nombre, tipo:r.tipo, fuente:r.fuente||"plan" }; msgForm=""; repinta(); });
      var bb=el("button","arcIcoBtn",ico("trash")); bb.setAttribute("aria-label","Quitar "+r.nombre);
      bb.addEventListener("click",function(){ if(!borraRegla(D,r.id,hoy()).error){ guarda(); if(editando===r.id){ editando=null; borrador=null; } repinta(); } });
      f.appendChild(be); f.appendChild(bb);
    }else{ var lk=el("span","arcIcoBtn",ico("lock-simple")); lk.setAttribute("aria-label","Bloqueada"); f.appendChild(lk); }
    cj.appendChild(f);
  });
  if(ed && (editando || n<MAX_REGLAS)) cj.appendChild(formRegla(repinta));
  if(ed && n>=MAX_REGLAS && !editando) cj.appendChild(el("p","arcS","Tienes "+MAX_REGLAS+" reglas, el máximo. Quita una para añadir otra."));
  s.appendChild(cj);
}
function formRegla(repinta){
  var b=borrador || (borrador={ nombre:"", tipo:"manual", fuente:"plan" });
  var f=el("div","arcForm");
  var lb=el("label","arcL",editando ? "Cambiar regla" : "Regla nueva"); lb.setAttribute("for","arcNom"); f.appendChild(lb);
  var inp=el("input"); inp.type="text"; inp.id="arcNom"; inp.maxLength=MAX_NOMBRE; inp.value=b.nombre; inp.autocomplete="off";
  inp.addEventListener("input",function(){ b.nombre=inp.value; });
  f.appendChild(inp);
  var seg=el("div","arcSeg"); seg.setAttribute("role","group"); seg.setAttribute("aria-label","Tipo de regla");
  [["manual","hand-tap","Manual"],["auto","lightning","Automática"]].forEach(function(o){
    var x=el("button","",ico(o[1])+'<span>'+o[2]+'</span>');
    x.setAttribute("aria-pressed",b.tipo===o[0]?"true":"false");
    x.addEventListener("click",function(){ b.tipo=o[0]; repinta(); });
    seg.appendChild(x);
  });
  f.appendChild(seg);
  if(b.tipo==="auto"){
    var ls=el("label","arcL","De dónde sale"); ls.setAttribute("for","arcFue"); f.appendChild(ls);
    var sel=el("select"); sel.id="arcFue";
    Object.keys(FUENTES).forEach(function(k){ var o=el("option","",esc(FUENTES[k])); o.value=k; if(k===b.fuente) o.selected=true; sel.appendChild(o); });
    sel.addEventListener("change",function(){ b.fuente=sel.value; repinta(); });
    f.appendChild(sel);
    f.appendChild(el("p","arcS", b.fuente==="plan" ? "Cumplida si lo del calendario Entreno de ese día está hecho en Strava o Hevy. Sin sesión o con descanso, cuenta sola."
                                                  : "Se marca sola cuando Strava o Hevy traen un entreno de ese tipo ese día. Sin nombre, toma el de la fuente."));
  }else f.appendChild(el("p","arcS","Se marca con un toque en HOY."));
  if(msgForm){ var m=el("p","arcAviso arcMal",ico("warning-circle")+'<span>'+esc(msgForm)+'</span>'); m.setAttribute("role","alert"); f.appendChild(m); }
  var ok=el("button","arcBot",editando ? "Guardar" : "Añadir regla");
  ok.addEventListener("click",function(){
    var x=editando ? editaRegla(S.D,editando,b,hoy()) : anadeRegla(S.D,b,hoy());
    if(x.error){ msgForm=x.error; repinta(); return; }
    guarda(); editando=null; borrador=null; msgForm=""; repinta();
  });
  f.appendChild(ok);
  if(editando){
    var can=el("button","arcBot2","Cancelar");
    can.addEventListener("click",function(){ editando=null; borrador=null; msgForm=""; repinta(); });
    f.appendChild(can);
  }
  return f;
}
var DESC={ A:"Anillos en la tarjeta del día", B:"Cada regla en la línea del día, a su hora", C:"Cabecera de temporada y la semana en puntos", D:"Una fila compacta en HOY" };
function pintaDiseno(w,repinta){
  var s=seccion(w,"Diseño"), g=el("div","arcOps"), act=diseno();
  g.setAttribute("role","radiogroup"); g.setAttribute("aria-label","Diseño del Arc");
  Object.keys(DISENOS).forEach(function(k){
    var b=el("button","arcOp",'<b>'+k+'</b><span><span>'+esc(DISENOS[k])+'</span><small>'+esc(DESC[k])+'</small></span>');
    b.setAttribute("role","radio"); b.setAttribute("aria-checked",k===act?"true":"false");
    b.addEventListener("click",function(){ guardaDiseno(P.almacen,k); selDia=null; repinta(); });
    g.appendChild(b);
  });
  s.appendChild(g);
  s.appendChild(el("p","arcS","Solo cambia cómo se ve. Los datos y lo que cuenta son los mismos en los cuatro."));
}
function subtitulo(){
  var h=hoy();
  if(enArc(h)) return "Día "+diaArc(h)+"/"+TOTAL+" · Semana "+semanaArc(h);
  return h<INICIO ? "Empieza el 1 de septiembre" : "Arc cerrado";
}
return {
  // datos, reglas y calendario (los usan los tests)
  VERSION_DATOS:VERSION_DATOS, K_DATOS:K_DATOS, K_DISENO:K_DISENO, K_SALUD:K_SALUD, INICIO:INICIO, FIN:FIN, EDITA_HASTA:EDITA_HASTA,
  TOTAL:TOTAL, SEMANAS:SEMANAS, MIN_REGLAS:MIN_REGLAS, MAX_REGLAS:MAX_REGLAS, DISENOS:DISENOS, DISENO_DEF:DISENO_DEF, SUENO_MIN:SUENO_MIN,
  enArc:enArc, diaArc:diaArc, semanaArc:semanaArc, editable:editable, mas:mas, preset:preset, presetEtapas:presetEtapas,
  vacio:vacio, migra:migra, carga:carga, guardaEn:guardaEn, leeDiseno:leeDiseno, guardaDiseno:guardaDiseno,
  leeSalud:leeSalud, mezclaSalud:mezclaSalud, cargaSalud:cargaSalud, guardaSalud:guardaSalud, suenoDe:suenoDe,
  planDelDia:planDelDia, registraAuto:registraAuto, estadoDia:estadoDia, fallosSeguidos:fallosSeguidos, cuenta:cuenta,
  resumen:resumen, revision:revision, fuerzas:fuerzas, totales:totales, planTotal:planTotal, statsEtapa:statsEtapa,
  etapaDe:etapaDe, ponEtapa:ponEtapa, anadeEtapa:anadeEtapa, borraEtapa:borraEtapa,
  anadeRegla:anadeRegla, editaRegla:editaRegla, borraRegla:borraRegla, marcaCheck:marcaCheck, ponNota:ponNota,
  ponAncla:ponAncla, ponObjetivo:ponObjetivo, objetivoEditable:objetivoEditable,
  presetViajes:presetViajes, CARRERA:CARRERA, romano:romano, destinoDe:destinoDe, lineaEtapa:lineaEtapa, volviste:volviste, kmSemana:kmSemana,
  viajesDe:viajesDe, iconoViaje:iconoViaje, anadeViaje:anadeViaje, ponViaje:ponViaje, borraViaje:borraViaje,
  // lo que usa la agenda
  conecta:conecta, registra:registra, vista:vista, pinta:pinta, pintaAjustes:pintaAjustes, subtitulo:subtitulo, diseno:diseno
};
});
