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
    { id:"e3", nombre:"Travesía", sub:"Preparar México y el viaje: nunca falles dos veces", desde:"2026-10-26", hasta:"2026-11-22", icono:"globe-hemisphere-west" },
    { id:"e4", nombre:"Vuelta", sub:"De vuelta en casa: recuperar el ritmo antes de Navidad", desde:"2026-11-23", hasta:"2026-12-20", icono:"house-line" },
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
  e3:[{ fecha:"2026-11-03", arriba:"DÍAS A", abajo:"MÉXICO", cero:["HOY","MÉXICO"], icono:"airplane-tilt", plur:"días a México", sing:"día a México", hoyTxt:"hoy vuelas a México" },
      { fecha:"2026-11-18", arriba:"DÍAS PARA", abajo:"VOLVER", cero:["HOY","MADRID"], icono:"airplane-tilt", plur:"días para volver", sing:"día para volver", hoyTxt:"hoy vuelves a Madrid" },
      { fecha:"2026-11-23", arriba:"DÍAS PARA", abajo:"LA VUELTA", cero:["HOY","VUELTA"], icono:"house-line", plur:"días para la Vuelta", sing:"día para la Vuelta", hoyTxt:"empieza la Vuelta" }],
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
var PROPIOS={ "torre-hercules":'<g fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M32 242h192"/><path d="M52 242v-14h152v14"/><path d="M98 228V100h60v128"/><path d="M88 100h80"/><path d="M98 206l60-8M98 170l60-8M98 134l60-8"/><path d="M104 100l10-28h28l10 28"/><path d="M108 72h40"/><path d="M116 72V54h24v18"/><path d="M110 54h36"/><path d="M121 54c0-11 3-17 7-17s7 6 7 17"/><path d="M128 37V26"/><path d="M108 54V34"/></g>' };
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
  ".arcProx>svg{width:20px;height:20px;color:var(--mu);flex:0 0 auto}"+
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
  ".arcViaje{display:grid;grid-template-columns:20px 1fr;column-gap:12px;align-items:center;min-height:44px;padding:4px 0}"+
  ".arcViaje svg{width:20px;height:20px;color:var(--mu)}"+
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
// los iconos de viaje de una etapa: ida (avion o faro si es A Coruña), carrera y sello
function marcasViaje(e){
  var M=[], V=viajesEntre(S.D,e.desde,e.hasta);
  V.forEach(function(v){
    if(v.a==="Madrid" || (v.de && v.de!=="Madrid")) return;             // vuelta a casa o vuelo dentro del destino
    M.push({ d:v.fecha, icono: /Coruña/.test(v.a) ? "torre-hercules" : "airplane-tilt", pri:1, posible:!!v.posible, v:v });
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
  // viajes: icono (grande) o muesca (corta). Dos a menos de 18 px: gana la prioridad
  var M=marcasViaje(e).sort(function(a,b){ return b.pri-a.pri; }), puestos=[];
  M.forEach(function(m){
    var cx=xs(m.d);
    if(grande){
      if(puestos.some(function(q){ return Math.abs(q-cx)<18; })) return;
      puestos.push(cx);
      s+=icoSvg(m.icono,Math.max(0,Math.min(W-16,cx-8)),4,16,m.tinta?"vT":"vM");
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
    return { nombre:v.a+(v.posible?" · posible":""), fecha:v.fecha, n:entre(h,v.fecha), icono:/Coruña/.test(v.a)?"torre-hercules":"airplane-tilt",
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
      if(st.estado==="actual") rejillaEtapa(dent,e,h);
      else if(st.estado==="pasada") acta(dent,e,i+1,h,F);
      else futura(dent,e);
      li.appendChild(dent);
    }
    ol.appendChild(li);
  });
  s.appendChild(ol);
}
// la rejilla de la etapa en curso: tocar un dia abre su detalle
function rejillaEtapa(w,e,h){
  var k=ctx(), g=el("div","arcGrid"), Lt=["L","M","X","J","V","S","D"], i;
  if(!selDia || selDia<e.desde || selDia>e.hasta) selDia = h;
  for(i=0;i<7;i++) g.appendChild(el("i","",Lt[i]));
  var d=mas(e.desde,-diaSem(e.desde)), fin=mas(e.hasta,6-diaSem(e.hasta));
  for(;d<=fin;d=mas(d,1)){
    if(d<e.desde || d>e.hasta){ g.appendChild(el("span","fuera","")); continue; }
    var st=estadoDia(S.D,d,h,k), cls = d>h ? "futuro" : st.estado==="cumplido" ? "cumplido" : st.hechas>0 ? "medio" : "nada";
    var b=el("button",cls+(d===h?" hoy":"")+(d===selDia?" sel":""),'<span>'+(+d.split("-")[2])+'</span>'+(cls==="medio" ? '<i style="width:'+(100*st.pct).toFixed(0)+'%"></i>' : ''));
    b.setAttribute("aria-label",larga(d)+": "+textoDia(st));
    (function(dd){ b.addEventListener("click",function(){ selDia=dd; pinta(document.getElementById("ptCuerpo")); }); })(d);
    g.appendChild(b);
  }
  w.appendChild(g);
  if(selDia){
    var e2=estadoDia(S.D,selDia,h,k), dj=el("div","arcCaja"); dj.style.marginTop="12px";
    dj.appendChild(el("p","arcT",esc(mayus(larga(selDia)))));
    dj.appendChild(el("p","arcS",esc(cabDia(e2)+" · "+(selDia>h ? "todavía no ha llegado" : textoDia(e2)))));
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
    var f=el("div","arcViaje"+(v.posible?" posible":""),ico(v.a==="Madrid" ? "house-line" : /Coruña/.test(v.a) ? "torre-hercules" : "airplane-tilt")+
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
  viajesDe:viajesDe, anadeViaje:anadeViaje, ponViaje:ponViaje, borraViaje:borraViaje,
  // lo que usa la agenda
  conecta:conecta, registra:registra, vista:vista, pinta:pinta, pintaAjustes:pintaAjustes, subtitulo:subtitulo, diseno:diseno
};
});
