/* ===========================================================================
   ARC (v2.5) · Winter Arc
   ---------------------------------------------------------------------------
   Temporada del 01/10/2026 al 31/12/2026: 92 dias en 13 semanas. Antes, del
   01/09 al 30/09, va el "Prologo": gris y de solo lectura, con lo que la app
   ya trae de Strava y Hevy desde el 31/08.

   De 3 a 5 reglas de si/no. Se editan hasta el 30/09 y se bloquean el dia 1.
   Cada regla es automatica (entreno hecho en Strava/Hevy) o manual (un toque
   en la agenda). Un fallo no reinicia nada: se cuentan los dias cumplidos,
   los que tienen todas las reglas hechas. Con 2 fallos seguidos sale un aviso
   discreto.

   Semanas de lunes a domingo: la revision es el domingo. La primera semana
   del calendario (jueves 1 a domingo 4) es corta y va junto a la siguiente,
   asi la semana 1 es del 1 al 11 de octubre, el dia 12 es la semana 2 y la
   13 es la ultima, del 28 al 31 de diciembre (se revisa el 31).

   Todo va en localStorage bajo "copiloto.arc.*", con version de datos. Este
   fichero no toca el GPS, la cinta ni la voz: la agenda le pasa lo hecho y el
   pinta su linea y su pantalla. En node se carga con require() para los tests.
   =========================================================================== */
(function(raiz, fabrica){
  var A=fabrica();
  if(typeof module==="object" && module.exports) module.exports=A; else raiz.Arc=A;
})(this, function(){
"use strict";

var VERSION_DATOS=1;
var K_DATOS="copiloto.arc.datos";
var PROLOGO="2026-09-01", INICIO="2026-10-01", FIN="2026-12-31";
var EDITA_HASTA="2026-09-30";
var MIN_REGLAS=3, MAX_REGLAS=5, MAX_NOMBRE=40;
var FUENTES={ correr:"Correr (Strava)", gym:"Gimnasio (Hevy)", entreno:"Cualquier entreno" };
var MESES=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
var MESES_L=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
var DIAS_L=["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];

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

var TOTAL=entre(INICIO,FIN)+1;                     // 92
var SEMANAS=(function(){
  var S=[], d=INICIO, f;
  while(d<=FIN){ f=mas(d,6-diaSem(d)); if(f>FIN) f=FIN; S.push({ desde:d, hasta:f }); d=mas(f,1); }
  if(S.length>1 && entre(S[0].desde,S[0].hasta)<6){ S[1].desde=S[0].desde; S.shift(); }
  S.forEach(function(s,i){ s.n=i+1; s.dias=entre(s.desde,s.hasta)+1; });
  return S;
})();

function fase(iso){
  if(!iso) return null;
  if(iso>=INICIO && iso<=FIN) return "temporada";
  if(iso>=PROLOGO && iso<INICIO) return "prologo";
  return null;
}
function diaArc(iso){ return fase(iso)==="temporada" ? entre(INICIO,iso)+1 : null; }
function semanaDe(iso){
  if(fase(iso)!=="temporada") return null;
  for(var i=0;i<SEMANAS.length;i++) if(iso>=SEMANAS[i].desde && iso<=SEMANAS[i].hasta) return SEMANAS[i];
  return null;
}
function semanaArc(iso){ var s=semanaDe(iso); return s ? s.n : null; }
function editable(hoy){ return hoy<=EDITA_HASTA; }

/* ------------------------------- datos -------------------------------- */
function vacio(){ return { v:VERSION_DATOS, reglas:[], checks:{}, auto:{}, notas:{} }; }
function esObj(x){ return !!x && typeof x==="object" && !Array.isArray(x); }
function reglaValida(r){
  return esObj(r) && typeof r.id==="string" && typeof r.nombre==="string" && r.nombre.trim() &&
    (r.tipo==="manual" || (r.tipo==="auto" && FUENTES[r.fuente]));
}
function normaliza(x){
  var D=vacio();
  if(Array.isArray(x.reglas)) D.reglas=x.reglas.filter(reglaValida).slice(0,MAX_REGLAS).map(function(r){
    var o={ id:r.id, nombre:r.nombre.trim().slice(0,MAX_NOMBRE), tipo:r.tipo }; if(r.tipo==="auto") o.fuente=r.fuente; return o; });
  ["checks","auto","notas"].forEach(function(k){ if(esObj(x[k])) D[k]=x[k]; });
  return D;
}
// v0 (sin "v") -> v1. Una version mas nueva que esta app no se toca: solo se lee.
function migra(x){
  if(!esObj(x)) return { D:vacio(), error:"roto", soloLectura:true };
  if(x.v==null || x.v===0) return { D:normaliza(x), migrado:true };
  if(x.v===VERSION_DATOS) return { D:normaliza(x) };
  if(typeof x.v==="number" && x.v>VERSION_DATOS) return { D:normaliza(x), error:"nueva", soloLectura:true };
  return { D:vacio(), error:"roto", soloLectura:true };
}
function carga(almacen){
  var raw;
  try{ raw=almacen.getItem(K_DATOS); }catch(e){ return { D:vacio(), error:"almacen", soloLectura:true }; }
  if(raw==null) return { D:vacio() };
  try{ return migra(JSON.parse(raw)); }catch(e){ return { D:vacio(), error:"roto", soloLectura:true }; }
}
function guardaEn(almacen,D){ try{ almacen.setItem(K_DATOS,JSON.stringify(D)); return true; }catch(e){ return false; } }

/* --------------------------- lo hecho, por dia -------------------------- */
function tipoAct(a){
  if(a.fuente==="hevy" || /Weight|Workout|Crossfit|Training/i.test(a.deporte||"")) return "gym";
  if(/Run/.test(a.deporte||"")) return "correr";
  return "otro";
}
// guarda en Arc lo que traiga Strava/Hevy, para que no se pierda cuando la
// copia de lo hecho deje de llegar tan atras. Solo suma, nunca borra.
function registraAuto(D,acts,hoy){
  var cambia=false;
  (acts||[]).forEach(function(a){
    if(!a || !a.fecha || !fase(a.fecha) || a.fecha>hoy) return;
    var t=tipoAct(a), o=D.auto[a.fecha]||(D.auto[a.fecha]={});
    if(!o[t]){ o[t]=1; cambia=true; }
  });
  return cambia;
}
function autoDe(D,acts,iso){
  var o={}, g=D.auto[iso]||{}, k;
  for(k in g) o[k]=1;
  (acts||[]).forEach(function(a){ if(a && a.fecha===iso) o[tipoAct(a)]=1; });
  return o;
}
function okRegla(D,r,iso,acts){
  if(r.tipo==="manual") return !!(D.checks[iso] && D.checks[iso][r.id]);
  var a=autoDe(D,acts,iso);
  return r.fuente==="entreno" ? !!(a.correr||a.gym||a.otro) : !!a[r.fuente];
}

/* ------------------------------ un dia ------------------------------
   estado: futuro, hoy (sin cerrar todavia), cumplido, fallado, o vacio
   (sin reglas que se puedan mirar). En el prologo las manuales no cuentan:
   entonces no se podian marcar.                                          */
function estadoDia(D,iso,hoy,acts){
  var f=fase(iso);
  var R=D.reglas.map(function(r){
    return { regla:r, ok: (f==="prologo" && r.tipo==="manual") ? null : okRegla(D,r,iso,acts) };
  });
  var val=R.filter(function(x){ return x.ok!==null; });
  var hechas=val.filter(function(x){ return x.ok; }).length;
  var todas=val.length>0 && hechas===val.length, est;
  if(!val.length) est = iso>hoy ? "futuro" : "vacio";
  else if(iso>hoy) est="futuro";
  else if(todas) est="cumplido";
  else est = iso===hoy ? "hoy" : "fallado";
  return { iso:iso, fase:f, dia:diaArc(iso), semana:semanaArc(iso), reglas:R, hechas:hechas, cuentan:val.length, estado:est };
}
// dias fallados seguidos que terminan ayer (hoy aun esta abierto)
function fallosSeguidos(D,hoy,acts){
  if(!D.reglas.length) return 0;
  var n=0, d=mas(hoy,-1);
  while(fase(d)==="temporada" && estadoDia(D,d,hoy,acts).estado==="fallado"){ n++; d=mas(d,-1); }
  return n;
}
// cuentan los dias ya pasados y hoy solo si ya esta cerrado
function cuenta(D,desde,hasta,hoy,acts){
  var ult = hasta<hoy ? hasta : hoy, dias=0, cumplidos=0, i;
  var por=D.reglas.map(function(r){ return { regla:r, ok:0, total:0, pct:null }; });
  for(var d=desde; d<=ult; d=mas(d,1)){
    var e=estadoDia(D,d,hoy,acts);
    if(d<hoy || e.estado==="cumplido"){ dias++; if(e.estado==="cumplido") cumplidos++; }
    for(i=0;i<e.reglas.length;i++){
      var x=e.reglas[i]; if(x.ok===null) continue;
      if(d<hoy || x.ok){ por[i].total++; if(x.ok) por[i].ok++; }
    }
  }
  por.forEach(function(p){ p.pct = p.total ? Math.round(100*p.ok/p.total) : null; });
  return { dias:dias, cumplidos:cumplidos, porRegla:por };
}
function resumen(D,hoy,acts){ return cuenta(D,INICIO,FIN,hoy,acts); }
function resumenPrologo(D,hoy,acts){ return cuenta(D,PROLOGO,mas(INICIO,-1),hoy,acts); }
// la revision de cada semana: se abre su ultimo dia (domingo, o el 31/12)
function revision(D,hoy,acts){
  return SEMANAS.filter(function(s){ return s.desde<=hoy; }).map(function(s){
    var c=cuenta(D,s.desde,s.hasta,hoy,acts);
    return { n:s.n, desde:s.desde, hasta:s.hasta, dias:s.dias, abierta:hoy>=s.hasta, pasada:hoy>s.hasta,
             contados:c.dias, cumplidos:c.cumplidos, porRegla:c.porRegla, nota:D.notas[s.n]||"" };
  });
}

/* ----------------------------- cambios ----------------------------- */
function nuevoId(D){ var i=1; while(D.reglas.some(function(r){ return r.id==="r"+i; })) i++; return "r"+i; }
function limpiaRegla(x){
  var nombre=String(x && x.nombre || "").replace(/\s+/g," ").trim();
  var tipo = x && x.tipo==="auto" ? "auto" : "manual";
  var fuente = tipo==="auto" ? (FUENTES[x.fuente] ? x.fuente : null) : null;
  if(tipo==="auto" && !fuente) return { error:"Elige de dónde sale: correr, gimnasio o cualquier entreno." };
  if(!nombre && tipo==="auto") nombre=FUENTES[fuente].replace(/ \(.*\)$/,"");
  if(!nombre) return { error:"Ponle un nombre corto a la regla." };
  if(nombre.length>MAX_NOMBRE) return { error:"Máximo "+MAX_NOMBRE+" letras." };
  var r={ nombre:nombre, tipo:tipo }; if(fuente) r.fuente=fuente;
  return { regla:r };
}
function anadeRegla(D,x,hoy){
  if(!editable(hoy)) return { error:"Las reglas están bloqueadas desde el 1 de octubre." };
  if(D.reglas.length>=MAX_REGLAS) return { error:"Ya tienes "+MAX_REGLAS+" reglas, el máximo." };
  var l=limpiaRegla(x); if(l.error) return l;
  l.regla.id=nuevoId(D); D.reglas.push(l.regla);
  return { ok:true, regla:l.regla };
}
function editaRegla(D,id,x,hoy){
  if(!editable(hoy)) return { error:"Las reglas están bloqueadas desde el 1 de octubre." };
  var i=indice(D,id); if(i<0) return { error:"Esa regla ya no está." };
  var l=limpiaRegla(x); if(l.error) return l;
  l.regla.id=id; D.reglas[i]=l.regla;
  return { ok:true, regla:l.regla };
}
function borraRegla(D,id,hoy){
  if(!editable(hoy)) return { error:"Las reglas están bloqueadas desde el 1 de octubre." };
  var i=indice(D,id); if(i<0) return { error:"Esa regla ya no está." };
  D.reglas.splice(i,1);
  Object.keys(D.checks).forEach(function(d){ delete D.checks[d][id]; });
  return { ok:true };
}
function indice(D,id){ for(var i=0;i<D.reglas.length;i++) if(D.reglas[i].id===id) return i; return -1; }
// un toque en la agenda: solo reglas manuales, dias de la temporada y nunca el futuro
function marcaCheck(D,iso,id,valor,hoy){
  if(fase(iso)!=="temporada") return { error:"Solo se marca dentro de la temporada." };
  if(iso>hoy) return { error:"Ese día todavía no ha llegado." };
  var i=indice(D,id); if(i<0 || D.reglas[i].tipo!=="manual") return { error:"Esa regla no se marca a mano." };
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

/* ===========================================================================
   Lo que se ve. Un solo acento (--arc), iconos Phosphor, sin emojis.
   =========================================================================== */
var PH={
  "barbell":"M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.82c0,.06,0,.12,0,.18s0,.12,0,.18V192Zm32-24H208V88h16Z",
  "caret-left":"M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z",
  "caret-right":"M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z",
  "check-circle":"M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z",
  "check":"M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z",
  "circle":"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z",
  "flask":"M221.69,199.77,160,96.92V40h8a8,8,0,0,0,0-16H88a8,8,0,0,0,0,16h8V96.92L34.31,199.77A16,16,0,0,0,48,224H208a16,16,0,0,0,13.72-24.23ZM110.86,103.25A7.93,7.93,0,0,0,112,99.14V40h32V99.14a7.93,7.93,0,0,0,1.14,4.11L183.36,167c-12,2.37-29.07,1.37-51.75-10.11-15.91-8.05-31.05-12.32-45.22-12.81ZM48,208l28.54-47.58c14.25-1.74,30.31,1.85,47.82,10.72,19,9.61,35,12.88,48,12.88a69.89,69.89,0,0,0,19.55-2.7L208,208Z",
  "hand-tap":"M56,76a60,60,0,0,1,120,0,8,8,0,0,1-16,0,44,44,0,0,0-88,0,8,8,0,1,1-16,0Zm140,44a27.9,27.9,0,0,0-13.36,3.39A28,28,0,0,0,144,106.7V76a28,28,0,0,0-56,0v80l-3.82-6.13a28,28,0,0,0-48.41,28.17l29.32,50A8,8,0,1,0,78.89,220L49.6,170a12,12,0,1,1,20.78-12l.14.23,18.68,30A8,8,0,0,0,104,184V76a12,12,0,0,1,24,0v68a8,8,0,1,0,16,0V132a12,12,0,0,1,24,0v20a8,8,0,0,0,16,0v-4a12,12,0,0,1,24,0v36c0,21.61-7.1,36.3-7.16,36.42a8,8,0,0,0,3.58,10.73A7.9,7.9,0,0,0,208,232a8,8,0,0,0,7.16-4.42c.37-.73,8.85-18,8.85-43.58V148A28,28,0,0,0,196,120Z",
  "lightning":"M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z",
  "lock-simple":"M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z",
  "pencil-simple":"M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z",
  "plus":"M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z",
  "sneaker-move":"M231.16,166.63l-28.63-14.31A47.74,47.74,0,0,1,176,109.39V80a8,8,0,0,0-8-8,48.05,48.05,0,0,1-48-48,8,8,0,0,0-12.83-6.37L30.13,76l-.2.16a16,16,0,0,0-1.24,23.75L142.4,213.66a8,8,0,0,0,5.66,2.34H224a16,16,0,0,0,16-16V180.94A15.92,15.92,0,0,0,231.16,166.63ZM224,200H151.37L40,88.63l12.87-9.76,38.79,38.79A8,8,0,0,0,103,106.34L65.74,69.11l40-30.31A64.15,64.15,0,0,0,160,87.5v21.89a63.65,63.65,0,0,0,35.38,57.24L224,180.94ZM70.8,184H32a8,8,0,0,1,0-16H70.8a8,8,0,1,1,0,16Zm40,24a8,8,0,0,1-8,8H48a8,8,0,0,1,0-16h54.8A8,8,0,0,1,110.8,208Z",
  "snowflake":"M223.77,150.09a8,8,0,0,1-5.86,9.68l-24.64,6,6.46,24.11a8,8,0,0,1-5.66,9.8A8.25,8.25,0,0,1,192,200a8,8,0,0,1-7.72-5.93l-7.72-28.8L136,141.86v46.83l21.66,21.65a8,8,0,0,1-11.32,11.32L128,203.31l-18.34,18.35a8,8,0,0,1-11.32-11.32L120,188.69V141.86L79.45,165.27l-7.72,28.8A8,8,0,0,1,64,200a8.25,8.25,0,0,1-2.08-.27,8,8,0,0,1-5.66-9.8l6.46-24.11-24.64-6a8,8,0,0,1,3.82-15.54l29.45,7.23L112,128,71.36,104.54l-29.45,7.23A7.85,7.85,0,0,1,40,112a8,8,0,0,1-1.91-15.77l24.64-6L56.27,66.07a8,8,0,0,1,15.46-4.14l7.72,28.8L120,114.14V67.31L98.34,45.66a8,8,0,0,1,11.32-11.32L128,52.69l18.34-18.35a8,8,0,0,1,11.32,11.32L136,67.31v46.83l40.55-23.41,7.72-28.8a8,8,0,0,1,15.46,4.14l-6.46,24.11,24.64,6A8,8,0,0,1,216,112a7.85,7.85,0,0,1-1.91-.23l-29.45-7.23L144,128l40.64,23.46,29.45-7.23A8,8,0,0,1,223.77,150.09Z",
  "trash":"M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z",
  "warning-circle":"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z",
  "x":"M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
};
function ico(n){ return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="'+PH[n]+'"/></svg>'; }
function esc(t){ return String(t==null?"":t).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function el(tag,cls,html){ var d=document.createElement(tag); if(cls) d.className=cls; if(html!=null) d.innerHTML=html; return d; }
function plural(n,uno,varios){ return n+" "+(n===1?uno:(varios||uno+"s")); }

var CSS=
  ".arcLin,#arcP{--arc:#6cd3e0;--arcOsc:#0f2a2e}"+
  ".arcLin{background:var(--sf);border-radius:22px;padding:4px 6px 8px;margin-bottom:12px}"+
  ".arcCab{width:100%;display:flex;align-items:center;gap:12px;padding:10px 8px;text-align:left;color:var(--fg);min-height:52px}"+
  ".arcCab>svg{width:22px;height:22px;flex:0 0 auto;color:var(--arc)}"+
  ".arcCab>svg:last-child{width:16px;height:16px;color:var(--mu)}"+
  ".arcCab span{flex:1 1 auto;min-width:0}"+
  ".arcCab b{display:block;font-size:15px;font-weight:800}"+
  ".arcCab small{display:block;font-size:12px;font-weight:600;color:var(--mu);margin-top:1px}"+
  ".arcCks{display:flex;flex-wrap:wrap;gap:6px;padding:0 6px}"+
  ".arcCk{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:0 14px;border-radius:22px;"+
    "border:1px solid var(--ln);background:var(--sf2);color:var(--fg);font-size:14px;font-weight:700;text-align:left}"+
  ".arcCk svg{width:18px;height:18px;flex:0 0 auto;color:var(--mu)}"+
  ".arcCk.on{border-color:var(--arc);color:var(--arc)} .arcCk.on svg{color:var(--arc)}"+
  ".arcCk.auto{border-style:dashed;background:none}"+
  ".arcCk:disabled{opacity:.5}"+
  ".arcAviso{display:flex;gap:8px;align-items:center;font-size:12px;font-weight:600;color:var(--mu);padding:8px 8px 0}"+
  ".arcAviso svg{width:16px;height:16px;flex:0 0 auto}"+
  ".arcMal{color:#ffb4a0}"+
  "#arcP h4{margin:22px 2px 8px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}"+
  "#arcP .arcAviso{padding:0 2px 8px}"+
  ".arcTot{display:flex;align-items:baseline;gap:10px;margin:4px 2px 0}"+
  ".arcTot b{font-size:44px;font-weight:800;letter-spacing:-.03em;color:var(--arc);line-height:1}"+
  ".arcTot span{font-size:14px;font-weight:700;color:var(--mu)}"+
  ".arcLets,.arcRej{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}"+
  ".arcLets{margin-bottom:5px} .arcLets i{font-style:normal;text-align:center;font-size:11px;font-weight:700;color:var(--mu);letter-spacing:.08em}"+
  ".arcRej .c{height:38px;border-radius:9px;border:1px solid var(--ln);background:none;color:var(--mu);"+
    "font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0;min-height:0}"+
  ".arcRej .c.cumplido{background:var(--arc);border-color:var(--arc);color:var(--arcOsc)}"+
  ".arcRej .c.fallado{background:var(--sf2)}"+
  ".arcRej .c.hoy{border:2px solid var(--fg);color:var(--fg)}"+
  ".arcRej .c.sel{outline:2px solid var(--fg);outline-offset:2px}"+
  ".arcRej .c.mes{color:var(--fg)}"+
  ".arcRej.gris .c{cursor:default}"+
  ".arcRej.gris .c.cumplido{background:#4a4e56;border-color:#4a4e56;color:var(--fg)}"+
  ".arcRej.gris .c.fallado,.arcRej.gris .c.vacio{background:var(--sf2)}"+
  ".arcLey{display:flex;flex-wrap:wrap;gap:12px;margin:10px 2px 0;font-size:12px;font-weight:600;color:var(--mu)}"+
  ".arcLey i{display:inline-block;width:12px;height:12px;border-radius:4px;border:1px solid var(--ln);vertical-align:-2px;margin-right:5px}"+
  ".arcLey i.cumplido{background:var(--arc);border-color:var(--arc)} .arcLey i.fallado{background:var(--sf2)}"+
  ".arcCaja{background:var(--sf);border-radius:20px;padding:14px;margin-top:10px}"+
  ".arcCaja>b{display:block;font-size:16px;font-weight:800}"+
  ".arcCaja>small{display:block;font-size:12px;font-weight:600;color:var(--mu);margin-top:2px}"+
  ".arcCaja>small+b{margin-top:10px}"+
  ".arcBar.gris div i{background:#4a4e56}"+
  ".arcBar{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center;margin-top:12px}"+
  ".arcBar span{font-size:14px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
  ".arcBar em{font-style:normal;font-size:13px;font-weight:700;color:var(--mu)}"+
  ".arcBar div{grid-column:1/-1;height:6px;border-radius:3px;background:var(--sf2);overflow:hidden}"+
  ".arcBar div i{display:block;height:100%;background:var(--arc);border-radius:3px}"+
  ".arcRegla{display:flex;align-items:center;gap:12px;padding:12px 4px;border-top:1px solid var(--ln)}"+
  ".arcRegla:first-of-type{border-top:0}"+
  ".arcRegla>svg{width:20px;height:20px;flex:0 0 auto;color:var(--mu)}"+
  ".arcRegla span{flex:1 1 auto;min-width:0} .arcRegla b{display:block;font-size:15px;font-weight:800}"+
  ".arcRegla small{display:block;font-size:12px;font-weight:600;color:var(--mu)}"+
  ".arcRegla button{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--mu);border-radius:12px}"+
  ".arcRegla button svg{width:20px;height:20px}"+
  ".arcSeg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}"+
  ".arcSeg button{min-height:44px;border-radius:14px;border:1px solid var(--ln);background:var(--sf2);color:var(--fg);font-size:14px;font-weight:700;"+
    "display:flex;align-items:center;justify-content:center;gap:6px}"+
  ".arcSeg button svg{width:18px;height:18px}"+
  ".arcSeg button.on{border-color:var(--arc);color:var(--arc)}"+
  ".arcForm .bPri{margin-top:12px} .arcForm .bSec{flex:1 1 auto}"+
  "#arcP textarea{width:100%;min-height:72px;margin-top:10px;border-radius:14px;border:1px solid var(--ln);background:var(--sf2);"+
    "color:var(--fg);padding:10px 12px;font:600 14px Manrope,sans-serif;resize:vertical}"+
  "#arcP textarea:focus,#arcP input:focus{outline:2px solid var(--arc);outline-offset:1px}"+
  ".arcDet{margin-top:10px}"+
  ".arcDet .arcCks{padding:0;margin-top:10px}"+
  ".arcVacio{padding:18px 4px 4px;font-size:14px;font-weight:600;color:var(--mu);line-height:1.5}"+
  ".arcSkel{height:14px;width:60%;border-radius:7px;background:var(--sf2);margin-top:10px;animation:arcLat 1.2s ease-in-out infinite}"+
  "@keyframes arcLat{50%{opacity:.4}}"+
  "@media (prefers-reduced-motion:reduce){.arcSkel{animation:none}}";

/* ---------------------------- estado de la app ---------------------------- */
var P=null;          // lo que pasa la agenda: hoy(), acts(), estadoActs(), abre(), almacen
var S=null;          // { D, error, soloLectura }
var selDia=null, editando=null, borrador=null, msgForm="";

function conecta(p){
  P=p; S=carga(p.almacen);
  if(S.migrado && !S.soloLectura) guardaEn(p.almacen,S.D);
  if(typeof document!=="undefined" && !document.getElementById("arcCss")){
    var st=document.createElement("style"); st.id="arcCss"; st.textContent=CSS; document.head.appendChild(st);
  }
  registra();
}
function hoy(){ return P.hoy(); }
function acts(){ return P.acts() || []; }
function guarda(){ if(S.soloLectura) return false; var ok=guardaEn(P.almacen,S.D); if(!ok) S.error="guardar"; return ok; }
// la agenda llama aqui cada vez que llega lo hecho de Strava/Hevy
function registra(){ if(!P || !S || S.soloLectura) return; if(registraAuto(S.D,acts(),hoy())) guarda(); }

function textoError(){
  return S.error==="almacen" ? "Este navegador no deja guardar datos: Arc no puede apuntar nada."
       : S.error==="roto"    ? "Los datos de Arc de este móvil no se pueden leer. No se ha borrado nada; solo se enseñan."
       : S.error==="nueva"   ? "Estos datos son de una versión más nueva de la app. Actualiza para poder cambiarlos."
       : S.error==="guardar" ? "No se ha podido guardar el último cambio (¿memoria llena?)."
       : "";
}
function textoActs(){
  var e=P.estadoActs ? P.estadoActs() : "ok";
  return e==="cargando" ? "Trayendo Strava y Hevy… lo automático puede cambiar en un momento."
       : e==="error"    ? "Sin conexión con Strava y Hevy: lo automático sale con lo último guardado."
       : e==="sin_conexion" ? "Calendario sin conectar: las reglas automáticas no saben lo hecho."
       : "";
}
function subReglas(r){ return r.tipo==="auto" ? "Automática · "+FUENTES[r.fuente] : "Manual · un toque en la agenda"; }
function icoRegla(r){ return r.tipo==="manual" ? "hand-tap" : r.fuente==="gym" ? "barbell" : r.fuente==="correr" ? "sneaker-move" : "lightning"; }

/* ------------------------- la linea de la agenda ------------------------- */
function linea(iso){
  if(!P || !S) return null;
  var h=hoy(), f=fase(iso);
  if(!f) return null;
  var sec=el("section","arcLin"), D=S.D, e=estadoDia(D,iso,h,acts());
  var tit, sub="";
  if(f==="prologo"){
    var falta=entre(h,INICIO);
    tit="Arc · Prólogo";
    sub = !D.reglas.length ? "Pon de 3 a 5 reglas antes del 1 de octubre"
        : D.reglas.length<MIN_REGLAS ? "Faltan "+plural(MIN_REGLAS-D.reglas.length,"regla")+" · se bloquean el 1 de octubre"
        : falta>0 ? "Empieza en "+plural(falta,"día") : "Empieza hoy";
  }else{
    tit="Arc · Día "+e.dia+"/"+TOTAL+" · Semana "+e.semana;
    if(!D.reglas.length) sub="Sin reglas: Arc no cuenta nada";
    else if(iso>h) sub="Todavía no ha llegado";
    else sub = e.hechas+" de "+e.cuentan+(e.estado==="cumplido" ? " · día cumplido" : iso<h ? " · sin cerrar" : " hoy");
    var sem=semanaDe(iso);
    if(iso===h && sem && sem.hasta===h) sub+=" · toca la revisión";
  }
  var cab=el("button","arcCab",ico("snowflake")+'<span><b>'+esc(tit)+'</b><small>'+esc(sub)+'</small></span>'+ico("caret-right"));
  cab.setAttribute("aria-label",tit+". "+sub+". Abrir Arc");
  cab.addEventListener("click",function(){ selDia = fase(iso)==="temporada" ? iso : null; P.abre(); });
  sec.appendChild(cab);
  if(f==="temporada" && D.reglas.length) sec.appendChild(checks(e,iso,h,function(){ var n=linea(iso); if(n) sec.replaceWith(n); }));
  var fs = f==="temporada" && iso===h ? fallosSeguidos(D,h,acts()) : 0;
  if(fs>=2) sec.appendChild(el("div","arcAviso",ico("warning-circle")+'<span>'+fs+' días seguidos sin cerrar. No se reinicia nada: hoy cuenta igual.</span>'));
  var err=textoError(); if(err) sec.appendChild(el("div","arcAviso arcMal",ico("warning-circle")+'<span>'+esc(err)+'</span>'));
  return sec;
}
// los checks de un dia: las manuales se tocan, las automaticas solo se ven
function checks(e,iso,h,repinta){
  var w=el("div","arcCks"), carga=P.estadoActs && P.estadoActs()==="cargando";
  e.reglas.forEach(function(x){
    var r=x.regla, b;
    if(r.tipo==="manual"){
      b=el("button","arcCk"+(x.ok?" on":""),ico(x.ok?"check-circle":"circle")+'<span>'+esc(r.nombre)+'</span>');
      b.setAttribute("aria-pressed",x.ok?"true":"false");
      if(iso>h || S.soloLectura) b.disabled=true;
      else b.addEventListener("click",function(){
        if(!marcaCheck(S.D,iso,r.id,!x.ok,hoy()).error){ guarda(); repinta(); }
      });
    }else{
      var est = x.ok ? "hecho" : (carga && iso===h) ? "mirando…" : iso>h ? "" : iso===h ? "pendiente" : "no hecho";
      b=el("span","arcCk auto"+(x.ok?" on":""),ico(x.ok?"check-circle":"lightning")+'<span>'+esc(r.nombre)+(est?" · "+est:"")+'</span>');
      b.setAttribute("title","Automática: sale de "+FUENTES[r.fuente]);
    }
    w.appendChild(b);
  });
  return w;
}

/* ----------------------------- la pantalla ----------------------------- */
var LETRAS=["L","M","X","J","V","S","D"];
function rejilla(desde,hasta,h,gris,alTocar){
  var w=el("div");
  w.appendChild(el("div","arcLets",LETRAS.map(function(l){ return '<i>'+l+'</i>'; }).join("")));
  var g=el("div","arcRej"+(gris?" gris":"")), i, D=S.D, A=acts();
  for(i=0;i<diaSem(desde);i++) g.appendChild(el("span"));
  for(var d=desde; d<=hasta; d=mas(d,1)){
    var e=estadoDia(D,d,h,A), p=d.split("-");
    var c=el(gris?"span":"button","c "+e.estado+(d===h?" hoy":"")+(!gris && d===selDia?" sel":"")+(+p[2]===1?" mes":""),
             +p[2]===1 ? MESES[+p[1]-1] : String(+p[2]));
    var dice=larga(d)+": "+({ cumplido:"cumplido", fallado:"sin cerrar", hoy:"hoy, "+e.hechas+" de "+e.cuentan,
                              futuro:"todavía no", vacio:"sin datos" }[e.estado]);
    c.setAttribute("aria-label",dice); c.setAttribute("title",dice);
    if(!gris && alTocar) (function(dd){ c.addEventListener("click",function(){ alTocar(dd); }); })(d);
    g.appendChild(c);
  }
  w.appendChild(g);
  return w;
}
function barras(por,gris){
  var w=el("div");
  por.forEach(function(p){
    var pct=p.pct==null ? 0 : p.pct;
    w.appendChild(el("div","arcBar"+(gris?" gris":""),'<span>'+esc(p.regla.nombre)+'</span><em>'+(p.pct==null ? "–" : p.ok+"/"+p.total+" · "+p.pct+" %")+'</em>'+
      '<div><i style="width:'+pct+'%"></i></div>'));
  });
  return w;
}
function pinta(c){
  if(!P || !S){ c.innerHTML='<div class="arcVacio">Arc no ha arrancado. Cierra la app y vuelve a abrirla.</div>'; return; }
  var sc=c.scrollTop, h=hoy(), D=S.D, A=acts(), f=fase(h);
  c.innerHTML=""; var w=el("div"); w.id="arcP"; c.appendChild(w);
  function repinta(){ pinta(c); }
  var err=textoError(); if(err) w.appendChild(el("div","arcAviso arcMal",ico("warning-circle")+'<span>'+esc(err)+'</span>'));
  var ta=textoActs(); if(ta && D.reglas.some(function(r){ return r.tipo==="auto"; })) w.appendChild(el("div","arcAviso",ico("lightning")+'<span>'+esc(ta)+'</span>'));

  if(h<INICIO){
    pintaReglas(w,h,repinta);
    pintaPrologo(w,h);
    w.appendChild(el("h4","","Temporada · 1 oct – 31 dic"));
    w.appendChild(rejilla(INICIO,FIN,h,false,null));
  }else{
    var R=resumen(D,h,A);
    if(!D.reglas.length){
      w.appendChild(el("div","arcVacio","La temporada empezó sin reglas, así que Arc no tiene nada que contar. Las reglas se bloquearon el 1 de octubre."));
    }else{
      var ult=Math.min(TOTAL, entre(INICIO,h)+1);
      w.appendChild(el("div","arcTot",'<b>'+R.cumplidos+'</b><span>'+(R.cumplidos===1?"día cumplido":"días cumplidos")+
        (f==="temporada" ? ' · vas por el '+ult+' de '+TOTAL : ' de '+TOTAL)+'</span>'));
      var fs = f==="temporada" ? fallosSeguidos(D,h,A) : 0;
      if(fs>=2) w.appendChild(el("div","arcAviso",ico("warning-circle")+'<span>'+plural(fs,"día")+' seguidos sin cerrar. No se reinicia nada: hoy cuenta igual.</span>'));
    }
    w.appendChild(el("h4","","92 días"));
    if(!selDia && f==="temporada") selDia=h;
    w.appendChild(rejilla(INICIO,FIN,h,false,function(d){ selDia=d; repinta(); }));
    w.appendChild(el("div","arcLey",'<span><i class="cumplido"></i>cumplido</span><span><i class="fallado"></i>sin cerrar</span><span><i></i>por llegar</span>'));
    if(selDia && fase(selDia)==="temporada" && D.reglas.length){
      var e=estadoDia(D,selDia,h,A), det=el("div","arcCaja arcDet");
      det.appendChild(el("b","",esc(larga(selDia).replace(/^./,function(x){ return x.toUpperCase(); }))));
      det.appendChild(el("small","","Día "+e.dia+" · Semana "+e.semana+(selDia>h ? " · todavía no ha llegado" : " · "+e.hechas+" de "+e.cuentan)));
      det.appendChild(checks(e,selDia,h,repinta));
      w.appendChild(det);
    }
    if(D.reglas.length){
      w.appendChild(el("h4","","Por regla"));
      var cj=el("div","arcCaja"); cj.appendChild(el("small","",R.dias ? "Sobre "+plural(R.dias,"día")+" contados (hoy entra cuando lo cierras)" : "Todavía no hay días que contar"));
      cj.appendChild(barras(R.porRegla)); w.appendChild(cj);
      pintaRevision(w,h,A);
    }
    pintaReglas(w,h,repinta);
    pintaPrologo(w,h);
  }
  c.scrollTop=sc;
}
function pintaRevision(w,h,A){
  var L=revision(S.D,h,A).reverse();
  if(!L.length) return;
  w.appendChild(el("h4","","Revisión semanal"));
  L.forEach(function(s){
    var cj=el("div","arcCaja");
    cj.appendChild(el("b","","Semana "+s.n+" · "+corta(s.desde)+" – "+corta(s.hasta)));
    if(!s.abierta){
      cj.appendChild(el("small","","En curso · "+s.cumplidos+" "+(s.cumplidos===1?"día cumplido":"días cumplidos")+" de "+s.dias+
        " · se revisa el "+larga(s.hasta).split(" ")[0]+" "+corta(s.hasta)));
      w.appendChild(cj); return;
    }
    cj.appendChild(el("small","",s.cumplidos+" de "+s.dias+" días cumplidos"+(s.pasada ? "" : " · hoy toca revisarla")));
    cj.appendChild(barras(s.porRegla));
    var t=el("textarea"); t.value=s.nota; t.placeholder="Qué ha funcionado y qué cambias la semana que viene";
    t.setAttribute("aria-label","Nota de la semana "+s.n); t.maxLength=500;
    if(S.soloLectura) t.disabled=true;
    var tm=null;
    t.addEventListener("input",function(){ clearTimeout(tm); tm=setTimeout(function(){ ponNota(S.D,s.n,t.value); guarda(); },400); });
    t.addEventListener("blur",function(){ clearTimeout(tm); ponNota(S.D,s.n,t.value); guarda(); });
    cj.appendChild(t);
    w.appendChild(cj);
  });
}
function pintaPrologo(w,h){
  w.appendChild(el("h4","","Prólogo · septiembre"));
  var cj=el("div","arcCaja");
  cj.appendChild(el("small","","Solo lectura. Sale lo que registraron Strava y Hevy desde el 31/08; las reglas manuales no cuentan aquí."));
  var hayAuto=S.D.reglas.some(function(r){ return r.tipo==="auto"; });
  if(!S.D.reglas.length) cj.appendChild(el("div","arcVacio","Pon reglas para ver cómo habría ido septiembre."));
  else if(!hayAuto) cj.appendChild(el("div","arcVacio","Todas tus reglas son manuales: el prólogo no tiene nada que enseñar."));
  else if(P.estadoActs && P.estadoActs()==="cargando" && !acts().length){ cj.appendChild(el("div","arcSkel")); cj.appendChild(el("div","arcSkel")); }
  else{
    var R=resumenPrologo(S.D,h,acts());
    cj.appendChild(el("b","",R.cumplidos+" de "+R.dias+" días con todo lo automático hecho"));
    cj.appendChild(barras(R.porRegla.filter(function(p){ return p.regla.tipo==="auto"; }),true));
  }
  w.appendChild(cj);
  var g=rejilla(PROLOGO,mas(INICIO,-1),h,true,null);
  g.style.marginTop="10px"; w.appendChild(g);
}
function pintaReglas(w,h,repinta){
  var D=S.D, ed=editable(h) && !S.soloLectura, n=D.reglas.length;
  w.appendChild(el("h4","","Reglas · "+n+" de "+MAX_REGLAS));
  var cj=el("div","arcCaja");
  if(ed) cj.appendChild(el("small","",n<MIN_REGLAS ? "Faltan "+plural(MIN_REGLAS-n,"regla")+" (mínimo "+MIN_REGLAS+"). Se bloquean el 1 de octubre."
                                                   : "Puedes cambiarlas hasta el 30 de septiembre. El 1 de octubre se bloquean."));
  else cj.appendChild(el("small","",'Bloqueadas desde el 1 de octubre.'));
  if(!n) cj.appendChild(el("div","arcVacio","Aún no hay reglas. Cada una es un sí o un no de cada día: «Entrenar», «Leer 20 min», «Sin pantallas en la cama»…"));
  D.reglas.forEach(function(r){
    var f=el("div","arcRegla",ico(icoRegla(r))+'<span><b>'+esc(r.nombre)+'</b><small>'+esc(subReglas(r))+'</small></span>');
    if(ed){
      var be=el("button","",ico("pencil-simple")); be.setAttribute("aria-label","Cambiar "+r.nombre);
      be.addEventListener("click",function(){ editando=r.id; borrador={ nombre:r.nombre, tipo:r.tipo, fuente:r.fuente||"correr" }; msgForm=""; repinta(); });
      var bb=el("button","",ico("trash")); bb.setAttribute("aria-label","Quitar "+r.nombre);
      bb.addEventListener("click",function(){ if(!borraRegla(D,r.id,hoy()).error){ guarda(); if(editando===r.id){ editando=null; borrador=null; } repinta(); } });
      f.appendChild(be); f.appendChild(bb);
    }else f.appendChild(el("span","",ico("lock-simple"))).style.cssText="flex:0 0 20px;width:20px;color:var(--mu)";
    cj.appendChild(f);
  });
  if(ed && (editando || n<MAX_REGLAS)) cj.appendChild(formRegla(repinta));
  w.appendChild(cj);
}
function formRegla(repinta){
  var b=borrador || (borrador={ nombre:"", tipo:"manual", fuente:"correr" });
  var f=el("div","arcForm");
  f.appendChild(el("label","",editando ? "Cambiar regla" : "Regla nueva")).setAttribute("for","arcNom");
  var inp=el("input"); inp.type="text"; inp.id="arcNom"; inp.maxLength=MAX_NOMBRE; inp.value=b.nombre;
  inp.placeholder = b.tipo==="auto" ? "vacío = "+FUENTES[b.fuente].replace(/ \(.*\)$/,"") : "p. ej. Leer 20 min";
  inp.autocomplete="off"; inp.addEventListener("input",function(){ b.nombre=inp.value; });
  f.appendChild(inp);
  var seg=el("div","arcSeg");
  [["manual","hand-tap","Manual"],["auto","lightning","Automática"]].forEach(function(o){
    var x=el("button",b.tipo===o[0]?"on":"",ico(o[1])+'<span>'+o[2]+'</span>');
    x.setAttribute("aria-pressed",b.tipo===o[0]?"true":"false");
    x.addEventListener("click",function(){ b.tipo=o[0]; repinta(); });
    seg.appendChild(x);
  });
  f.appendChild(seg);
  if(b.tipo==="auto"){
    var sel=el("select"); sel.setAttribute("aria-label","De dónde sale");
    Object.keys(FUENTES).forEach(function(k){ var o=el("option","",esc(FUENTES[k])); o.value=k; if(k===b.fuente) o.selected=true; sel.appendChild(o); });
    sel.style.marginTop="8px";
    sel.addEventListener("change",function(){ b.fuente=sel.value; repinta(); });
    f.appendChild(sel);
    f.appendChild(el("div","ayuda","Se marca sola cuando Strava o Hevy traen un entreno de ese tipo ese día."));
  }else f.appendChild(el("div","ayuda","Se marca con un toque en la agenda de ese día."));
  if(msgForm) f.appendChild(el("div","arcAviso arcMal",ico("warning-circle")+'<span>'+esc(msgForm)+'</span>'));
  var ok=el("button","bPri",editando ? "Guardar" : "Añadir regla");
  ok.addEventListener("click",function(){
    var x=editando ? editaRegla(S.D,editando,b,hoy()) : anadeRegla(S.D,b,hoy());
    if(x.error){ msgForm=x.error; repinta(); return; }
    guarda(); editando=null; borrador=null; msgForm=""; repinta();
  });
  f.appendChild(ok);
  if(editando){
    var fila=el("div","hFila2"), can=el("button","bSec","Cancelar");
    can.addEventListener("click",function(){ editando=null; borrador=null; msgForm=""; repinta(); });
    fila.appendChild(can); f.appendChild(fila);
  }
  return f;
}
function subtitulo(){
  var h=hoy(), f=fase(h);
  if(f==="temporada") return "Día "+diaArc(h)+"/"+TOTAL+" · Semana "+semanaArc(h);
  if(f==="prologo") return "Prólogo · empieza el 1 de octubre";
  return h<PROLOGO ? "Empieza el 1 de octubre" : "Temporada cerrada";
}

return {
  // datos y reglas del calendario (los usan los tests)
  VERSION_DATOS:VERSION_DATOS, K_DATOS:K_DATOS, PROLOGO:PROLOGO, INICIO:INICIO, FIN:FIN, EDITA_HASTA:EDITA_HASTA,
  TOTAL:TOTAL, SEMANAS:SEMANAS, MIN_REGLAS:MIN_REGLAS, MAX_REGLAS:MAX_REGLAS,
  fase:fase, diaArc:diaArc, semanaArc:semanaArc, editable:editable, mas:mas,
  vacio:vacio, migra:migra, carga:carga, guardaEn:guardaEn,
  registraAuto:registraAuto, estadoDia:estadoDia, fallosSeguidos:fallosSeguidos,
  resumen:resumen, resumenPrologo:resumenPrologo, revision:revision,
  anadeRegla:anadeRegla, editaRegla:editaRegla, borraRegla:borraRegla, marcaCheck:marcaCheck, ponNota:ponNota,
  // lo que usa la agenda
  conecta:conecta, registra:registra, linea:linea, pinta:pinta, subtitulo:subtitulo,
  enTemporada:function(){ return !!(P && fase(hoy())); }
};
});
