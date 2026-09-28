/* ===========================================================================
   ARC (v2.6) · Winter Arc
   ---------------------------------------------------------------------------
   Temporada del 01/10/2026 al 31/12/2026: 92 dias en 13 semanas. Antes, del
   01/09 al 30/09, va el "Prologo": gris y de solo lectura, con lo que la app
   ya trae del calendario, Strava y Hevy desde el 31/08.

   El metodo:
   - Un solo objetivo del Arc (texto libre, vacio hasta que lo escribas).
   - De 3 a 5 reglas de si/no. Vienen precargadas tres: "Cumplir el plan de
     Entreno" (automatica), "Dormir 7 h o mas" y "20 min de estudio o
     lectura" (manuales). Se editan hasta el 30/09 y se bloquean el dia 1.
   - Los dias cumplidos (todas las reglas hechas) solo suman: un fallo no
     reinicia ni resta nada. Solo con 2 fallos seguidos sale un aviso.
   - Revision semanal el domingo.

   Semanas de lunes a domingo: la primera del calendario (jueves 1 a domingo
   4) es corta y va junto a la siguiente. Asi la semana 1 es del 1 al 11/10,
   el dia 12 es la semana 2 y la 13 va del 28 al 31/12 (se revisa el 31).

   Hay cuatro disenos (A anillos, B linea del dia, C temporada, D cuadricula)
   que comparten estos datos y esta logica: solo cambia la vista. Todo va en
   localStorage bajo "copiloto.arc.*", con version de datos. Este fichero no
   toca el GPS, la cinta ni la voz: la agenda le pasa el calendario y lo
   hecho, y el pinta. En node se carga con require() para los tests.
   =========================================================================== */
(function(raiz, fabrica){
  var A=fabrica();
  if(typeof module==="object" && module.exports) module.exports=A; else raiz.Arc=A;
})(this, function(){
"use strict";

var VERSION_DATOS=2;
var K_DATOS="copiloto.arc.datos", K_DISENO="copiloto.arc.diseno";
var PROLOGO="2026-09-01", INICIO="2026-10-01", FIN="2026-12-31";
var EDITA_HASTA="2026-09-30";
var MIN_REGLAS=3, MAX_REGLAS=5, MAX_NOMBRE=40, MAX_OBJETIVO=140;
var FUENTES={ plan:"Plan de Entreno", correr:"Correr (Strava)", gym:"Gimnasio (Hevy)", entreno:"Cualquier entreno" };
// D por defecto: hasta Roma (18/10) HOY deja la tarjeta y "Empezar" arriba (docs/propuestas-arc)
var DISENOS={ A:"Anillos", B:"Línea del día", C:"Temporada", D:"Cuadrícula" }, DISENO_DEF="D";
var MESES=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
var MESES_L=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
var DIAS_L=["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];

// las tres reglas que trae el Arc; se pueden cambiar hasta el 30/09
function preset(){
  return [
    { id:"plan", nombre:"Cumplir el plan de Entreno", tipo:"auto", fuente:"plan", ancla:"20:00" },
    { id:"dormir", nombre:"Dormir 7 h o más", tipo:"manual", ayuda:"Se marca al levantarse y cuenta para ese día", ancla:"08:00" },
    { id:"estudio", nombre:"20 min de estudio o lectura", tipo:"manual", ancla:"21:00" }
  ];
}

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
function vacio(){ return { v:VERSION_DATOS, objetivo:"", reglas:preset(), checks:{}, auto:{}, plan:{}, notas:{} }; }
function esObj(x){ return !!x && typeof x==="object" && !Array.isArray(x); }
function esHora(h){ return typeof h==="string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(h); }
function reglaValida(r){
  return esObj(r) && typeof r.id==="string" && typeof r.nombre==="string" && r.nombre.trim() &&
    (r.tipo==="manual" || (r.tipo==="auto" && FUENTES[r.fuente]));
}
function limpiaGuardada(r){
  var o={ id:r.id, nombre:r.nombre.trim().slice(0,MAX_NOMBRE), tipo:r.tipo };
  if(r.tipo==="auto") o.fuente=r.fuente;
  if(typeof r.ayuda==="string" && r.ayuda.trim()) o.ayuda=r.ayuda.trim().slice(0,80);
  o.ancla = esHora(r.ancla) ? r.ancla : (r.tipo==="auto" ? "20:00" : "21:00");
  return o;
}
function normaliza(x){
  var D=vacio();
  D.reglas = Array.isArray(x.reglas) ? x.reglas.filter(reglaValida).slice(0,MAX_REGLAS).map(limpiaGuardada) : [];
  D.objetivo = typeof x.objetivo==="string" ? x.objetivo.slice(0,MAX_OBJETIVO) : "";
  ["checks","auto","plan","notas"].forEach(function(k){ if(esObj(x[k])) D[k]=x[k]; });
  if(Array.isArray(x.reglasPrevias)) D.reglasPrevias=x.reglasPrevias.filter(reglaValida).map(limpiaGuardada);
  return D;
}
function mismasReglas(a,b){
  return a.length===b.length && a.every(function(r,i){ return r.nombre===b[i].nombre && r.tipo===b[i].tipo && r.fuente===b[i].fuente; });
}
/* v0/v1 -> v2. Hasta el 30/09, y si aun no hay ningun check, las reglas
   pasan a ser las tres precargadas; las que hubiera se guardan en
   "reglasPrevias" (no se borra nada). Desde el 1/10 se respetan tal cual.
   Una version mas nueva que esta app no se toca: solo se lee.              */
function migra(x,hoy){
  if(!esObj(x)) return { D:vacio(), error:"roto", soloLectura:true };
  if(x.v==null || x.v===0 || x.v===1){
    var D=normaliza(x);
    if(hoy && editable(hoy) && !Object.keys(D.checks).length && !mismasReglas(D.reglas,preset())){
      if(D.reglas.length) D.reglasPrevias=D.reglas;
      D.reglas=preset();
    }
    return { D:D, migrado:true };
  }
  if(x.v===VERSION_DATOS) return { D:normaliza(x) };
  if(typeof x.v==="number" && x.v>VERSION_DATOS) return { D:normaliza(x), error:"nueva", soloLectura:true };
  return { D:vacio(), error:"roto", soloLectura:true };
}
function carga(almacen,hoy){
  var raw;
  try{ raw=almacen.getItem(K_DATOS); }catch(e){ return { D:vacio(), error:"almacen", soloLectura:true }; }
  if(raw==null) return { D:vacio() };
  try{ return migra(JSON.parse(raw),hoy); }catch(e){ return { D:vacio(), error:"roto", soloLectura:true }; }
}
function guardaEn(almacen,D){ try{ almacen.setItem(K_DATOS,JSON.stringify(D)); return true; }catch(e){ return false; } }

/* --------------------------- lo hecho, por dia -------------------------- */
function tipoAct(a){
  if(a.fuente==="hevy" || /Weight|Workout|Crossfit|Training/i.test(a.deporte||"")) return "gym";
  if(/Run/.test(a.deporte||"")) return "correr";
  return "otro";
}
// el mismo emparejamiento que la agenda: calle con carrera al aire libre,
// cinta con carrera de interior, gimnasio con fuerza (Hevy)
function compatible(e,a){
  var run=/Run/.test(a.deporte||"");
  if(!e.plan && (e.tipo==="fuera" || e.tipo==="cinta")) return run;
  if(e.tipo==="fuera") return run && !a.cinta;
  if(e.tipo==="cinta") return run && (!!a.cinta || /Virtual/.test(a.deporte||""));
  if(e.tipo==="gym") return tipoAct(a)==="gym";
  return false;
}
/* "Cumplir el plan de Entreno": las sesiones del dia (calle, cinta o gym;
   un "Descanso" o un evento suelto no es sesion) contra lo hecho. Cada
   actividad vale para una sola sesion. Sin sesiones, se cumple sola.     */
function planDelDia(E,A){
  var ses=(E||[]).filter(function(e){ return e.tipo==="fuera" || e.tipo==="cinta" || e.tipo==="gym"; });
  var usadas={}, hechas=0;
  ses.forEach(function(e){
    for(var i=0;i<(A||[]).length;i++) if(!usadas[i] && compatible(e,A[i])){ usadas[i]=1; hechas++; return; }
  });
  return { s:ses.length, h:hechas };
}
function ctxDe(c){
  if(Array.isArray(c)) return { acts:c, eventos:null };
  return { acts:(c && c.acts) || [], eventos:(c && c.eventos) || null };
}
function actsDel(acts,iso){ return acts.filter(function(a){ return a && a.fecha===iso; }); }
// el plan de un dia: lo del calendario si esta; si no, lo que se guardo.
// Si Strava ya no trae una actividad vieja, vale lo guardado (nunca resta).
function planDe(D,iso,c){
  var g=D.plan[iso]||null, E=c.eventos ? c.eventos(iso) : null;
  if(!E) return g;
  var p=planDelDia(E,actsDel(c.acts,iso));
  if(g && g.s===p.s && g.h>p.h) p.h=g.h;
  return p;
}
// guarda en Arc lo que traigan Strava/Hevy y el calendario, para que no se
// pierda cuando la copia deje de llegar tan atras
function registraAuto(D,c,hoy){
  c=ctxDe(c);
  var cambia=false;
  c.acts.forEach(function(a){
    if(!a || !a.fecha || !fase(a.fecha) || a.fecha>hoy) return;
    var t=tipoAct(a), o=D.auto[a.fecha]||(D.auto[a.fecha]={});
    if(!o[t]){ o[t]=1; cambia=true; }
  });
  if(c.eventos){
    var ult = hoy<FIN ? hoy : FIN;
    for(var d=PROLOGO; d<=ult; d=mas(d,1)){
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
function okRegla(D,r,iso,c){
  if(r.tipo==="manual") return { ok:!!(D.checks[iso] && D.checks[iso][r.id]) };
  if(r.fuente==="plan"){
    var p=planDe(D,iso,c);
    if(!p) return { ok:false, sinDatos:true };
    return { ok:p.h>=p.s, plan:p };
  }
  var a=autoDe(D,c.acts,iso);
  return { ok: r.fuente==="entreno" ? !!(a.correr||a.gym||a.otro) : !!a[r.fuente] };
}

/* ------------------------------ un dia ------------------------------
   estado: futuro, hoy (sin cerrar todavia), cumplido, fallado, o vacio
   (sin reglas que se puedan mirar). En el prologo las manuales no cuentan:
   entonces no se podian marcar.                                          */
function estadoDia(D,iso,hoy,c){
  c=ctxDe(c);
  var f=fase(iso);
  var R=D.reglas.map(function(r){
    if(f==="prologo" && r.tipo==="manual") return { regla:r, ok:null };
    var x=okRegla(D,r,iso,c); x.regla=r; return x;
  });
  var val=R.filter(function(x){ return x.ok!==null; });
  var hechas=val.filter(function(x){ return x.ok; }).length;
  var todas=val.length>0 && hechas===val.length, est;
  if(!val.length) est = iso>hoy ? "futuro" : "vacio";
  else if(iso>hoy) est="futuro";
  else if(todas) est="cumplido";
  else est = iso===hoy ? "hoy" : "fallado";
  return { iso:iso, fase:f, dia:diaArc(iso), semana:semanaArc(iso), reglas:R, hechas:hechas, cuentan:val.length,
           pct: val.length ? hechas/val.length : 0, estado:est };
}
// dias fallados seguidos que terminan ayer (hoy aun esta abierto)
function fallosSeguidos(D,hoy,c){
  if(!D.reglas.length) return 0;
  var n=0, d=mas(hoy,-1);
  while(fase(d)==="temporada" && estadoDia(D,d,hoy,c).estado==="fallado"){ n++; d=mas(d,-1); }
  return n;
}
// cuentan los dias ya pasados y hoy solo si ya esta cerrado
function cuenta(D,desde,hasta,hoy,c){
  c=ctxDe(c);
  var ult = hasta<hoy ? hasta : hoy, dias=0, cumplidos=0, i;
  var por=D.reglas.map(function(r){ return { regla:r, ok:0, total:0, pct:null }; });
  for(var d=desde; d<=ult; d=mas(d,1)){
    var e=estadoDia(D,d,hoy,c);
    if(d<hoy || e.estado==="cumplido"){ dias++; if(e.estado==="cumplido") cumplidos++; }
    for(i=0;i<e.reglas.length;i++){
      var x=e.reglas[i]; if(x.ok===null) continue;
      if(d<hoy || x.ok){ por[i].total++; if(x.ok) por[i].ok++; }
    }
  }
  por.forEach(function(p){ p.pct = p.total ? Math.round(100*p.ok/p.total) : null; });
  return { dias:dias, cumplidos:cumplidos, porRegla:por };
}
function resumen(D,hoy,c){ return cuenta(D,INICIO,FIN,hoy,c); }
function resumenPrologo(D,hoy,c){ return cuenta(D,PROLOGO,mas(INICIO,-1),hoy,c); }
// la revision de cada semana: se abre su ultimo dia (domingo, o el 31/12)
function revision(D,hoy,c){
  return SEMANAS.filter(function(s){ return s.desde<=hoy; }).map(function(s){
    var k=cuenta(D,s.desde,s.hasta,hoy,c);
    return { n:s.n, desde:s.desde, hasta:s.hasta, dias:s.dias, abierta:hoy>=s.hasta, pasada:hoy>s.hasta,
             contados:k.dias, cumplidos:k.cumplidos, porRegla:k.porRegla, nota:D.notas[s.n]||"" };
  });
}

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
  D.reglas.push(l.regla);
  return { ok:true, regla:l.regla };
}
function editaRegla(D,id,x,hoy){
  if(!editable(hoy)) return { error:BLOQUEADAS };
  var i=indice(D,id); if(i<0) return { error:"Esa regla ya no está." };
  var l=limpiaRegla(x); if(l.error) return l;
  var ant=D.reglas[i];
  l.regla.id=id; l.regla.ancla=ant.ancla;
  if(ant.ayuda && ant.nombre===l.regla.nombre && ant.tipo===l.regla.tipo) l.regla.ayuda=ant.ayuda;
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
// la hora ancla solo coloca la regla en la linea del dia (diseno B): se
// puede cambiar siempre, no toca lo que cuenta
function ponAncla(D,id,h){
  var i=indice(D,id); if(i<0) return { error:"Esa regla ya no está." };
  if(!esHora(h)) return { error:"Hora no válida." };
  D.reglas[i].ancla=h;
  return { ok:true };
}
// el objetivo se escribe hasta el 30/09; si el 1/10 sigue vacio, se puede
// escribir una vez mas (sin objetivo el Arc pierde su sentido)
function objetivoEditable(D,hoy){ return editable(hoy) || !String(D.objetivo||"").trim(); }
function ponObjetivo(D,t,hoy){
  if(!objetivoEditable(D,hoy)) return { error:"El objetivo se fijó al empezar la temporada." };
  D.objetivo=String(t||"").replace(/\s+/g," ").slice(0,MAX_OBJETIVO);
  return { ok:true };
}
// un toque: solo reglas manuales, dias de la temporada y nunca el futuro
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
function leeDiseno(almacen){ var x=null; try{ x=almacen.getItem(K_DISENO); }catch(e){} return DISENOS[x] ? x : DISENO_DEF; }
function guardaDiseno(almacen,x){ if(!DISENOS[x]) return false; try{ almacen.setItem(K_DISENO,x); return true; }catch(e){ return false; } }

/* ===========================================================================
   Lo que se ve. Iconos Phosphor (regular), sin emojis.
   =========================================================================== */
var PH={
  "barbell":"M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.82c0,.06,0,.12,0,.18s0,.12,0,.18V192Zm32-24H208V88h16Z",
  "caret-right":"M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z",
  "check":"M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z",
  "check-circle":"M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z",
  "circle":"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z",
  "hand-tap":"M56,76a60,60,0,0,1,120,0,8,8,0,0,1-16,0,44,44,0,0,0-88,0,8,8,0,1,1-16,0Zm140,44a27.9,27.9,0,0,0-13.36,3.39A28,28,0,0,0,144,106.7V76a28,28,0,0,0-56,0v80l-3.82-6.13a28,28,0,0,0-48.41,28.17l29.32,50A8,8,0,1,0,78.89,220L49.6,170a12,12,0,1,1,20.78-12l.14.23,18.68,30A8,8,0,0,0,104,184V76a12,12,0,0,1,24,0v68a8,8,0,1,0,16,0V132a12,12,0,0,1,24,0v20a8,8,0,0,0,16,0v-4a12,12,0,0,1,24,0v36c0,21.61-7.1,36.3-7.16,36.42a8,8,0,0,0,3.58,10.73A7.9,7.9,0,0,0,208,232a8,8,0,0,0,7.16-4.42c.37-.73,8.85-18,8.85-43.58V148A28,28,0,0,0,196,120Z",
  "lightning":"M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z",
  "lock-simple":"M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z",
  "pencil-simple":"M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z",
  "sneaker-move":"M231.16,166.63l-28.63-14.31A47.74,47.74,0,0,1,176,109.39V80a8,8,0,0,0-8-8,48.05,48.05,0,0,1-48-48,8,8,0,0,0-12.83-6.37L30.13,76l-.2.16a16,16,0,0,0-1.24,23.75L142.4,213.66a8,8,0,0,0,5.66,2.34H224a16,16,0,0,0,16-16V180.94A15.92,15.92,0,0,0,231.16,166.63ZM224,200H151.37L40,88.63l12.87-9.76,38.79,38.79A8,8,0,0,0,103,106.34L65.74,69.11l40-30.31A64.15,64.15,0,0,0,160,87.5v21.89a63.65,63.65,0,0,0,35.38,57.24L224,180.94ZM70.8,184H32a8,8,0,0,1,0-16H70.8a8,8,0,1,1,0,16Zm40,24a8,8,0,0,1-8,8H48a8,8,0,0,1,0-16h54.8A8,8,0,0,1,110.8,208Z",
  "trash":"M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z",
  "warning-circle":"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z",
  "calendar-check":"M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-38.34-85.66a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L116,164.69l42.34-42.35A8,8,0,0,1,169.66,122.34Z",
  "moon":"M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z",
  "book-open":"M232,48H160a40,40,0,0,0-32,16A40,40,0,0,0,96,48H24a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H96a24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24h72a8,8,0,0,0,8-8V56A8,8,0,0,0,232,48ZM96,192H32V64H96a24,24,0,0,1,24,24V200A39.81,39.81,0,0,0,96,192Zm128,0H160a39.81,39.81,0,0,0-24,8V88a24,24,0,0,1,24-24h64Z",
  "clock":"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"
};
function ico(n){ return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="'+(PH[n]||PH.circle)+'"/></svg>'; }
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
  /* bloque suelto de HOY (prologo, D, C) */
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
  ".arcCont{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}"+
  ".arcFila{display:flex;align-items:center;gap:12px;min-height:56px;border-top:1px solid var(--ln)}"+
  ".arcFila:first-child{border-top:0}"+
  ".arcFila>span{flex:1 1 auto;min-width:0}"+
  ".arcFila>svg{width:20px;height:20px;flex:0 0 auto;color:var(--mu)}"+
  ".arcFila .arcT{display:block;overflow-wrap:anywhere}"+
  ".arcFila .arcS{display:block}"+
  ".arcIcoBtn{width:44px;height:44px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;border:0;background:none;color:var(--mu);border-radius:12px;padding:0}"+
  ".arcIcoBtn svg{width:20px;height:20px}"+
  ".arcHora{width:92px;min-height:44px;border-radius:12px;border:1px solid var(--ln);background:var(--sf2);color:var(--fg);font:600 15px Manrope,sans-serif;padding:0 8px}"+
  ".arcBar{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;padding:8px 0}"+
  ".arcBar span{font-size:15px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fg)}"+
  ".arcBar em{font-style:normal;font-size:12px;font-weight:700;color:var(--mu)}"+
  ".arcBar div{grid-column:1/-1;height:4px;border-radius:2px;background:var(--sf2);overflow:hidden}"+
  ".arcBar div i{display:block;height:100%;background:var(--fg);opacity:.7}"+
  /* rejillas: calendario (prologo) y cuadricula de 7 x 14 (D) */
  ".arcCal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:8px}"+
  ".arcCal i{font-style:normal;text-align:center;font-size:12px;font-weight:700;color:var(--mu);letter-spacing:.06em}"+
  ".arcCal span{height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--mu);background:var(--sf2)}"+
  ".arcCal span.si{background:var(--mu);color:var(--bg)}"+
  ".arcCal span.no{background:none}"+
  ".arcGrid{display:grid;grid-template-columns:28px repeat(7,minmax(0,1fr));gap:2px;margin-top:8px;align-items:center}"+
  ".arcGrid i{font-style:normal;font-size:12px;font-weight:700;color:var(--mu);text-align:center;letter-spacing:.06em}"+
  ".arcGrid b{font-size:12px;font-weight:700;color:var(--mu)}"+
  ".arcGrid button,.arcGrid span{height:44px;border-radius:8px;border:1px solid var(--ln);background:none;padding:0;"+
    "font-size:12px;font-weight:600;color:var(--mu);display:flex;align-items:center;justify-content:center}"+
  ".arcGrid .cumplido{color:var(--arcTx)} .arcGrid .hoy{color:var(--fg)}"+
  ".arcGrid span{border:0}"+
  ".arcGrid .cumplido{background:var(--arc);border-color:var(--arc)}"+
  ".arcGrid .fallado,.arcGrid .vacio{background:var(--sf2)}"+
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
  "@media (prefers-reduced-motion:reduce){.arcCk,.arcChip,.ring .arco{transition:none}}";

/* ---------------------------- estado de la app ---------------------------- */
var P=null;          // lo que pasa la agenda: hoy(), acts(), eventos(), estadoActs(), abre(), almacen...
var S=null;          // { D, error, soloLectura }
var selDia=null, editando=null, borrador=null, msgForm="", t0Carga=0, irRev=false;

function conecta(p){
  P=p; S=carga(p.almacen,p.hoy());
  if(S.migrado && !S.soloLectura) guardaEn(p.almacen,S.D);
  if(typeof document!=="undefined" && !document.getElementById("arcCss")){
    var st=document.createElement("style"); st.id="arcCss"; st.textContent=CSS; document.head.appendChild(st);
  }
  registra();
}
function hoy(){ return P.hoy(); }
function ctx(){ return { acts:P.acts()||[], eventos:P.eventos||null }; }
function guarda(){ if(S.soloLectura) return false; var ok=guardaEn(P.almacen,S.D); if(!ok) S.error="guardar"; return ok; }
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
  if(x.ok===null) return "no cuenta en el prólogo";
  if(r.tipo==="manual") return x.ok ? "hecho" : iso>h ? "todavía no" : "sin marcar";
  if(x.sinDatos) return iso>h ? "todavía no" : "sin datos del calendario";
  if(x.plan && x.plan.s===0) return "sin sesión: cuenta sola";
  if(x.ok) return x.plan ? (x.plan.s>1 ? x.plan.h+" de "+x.plan.s+" sesiones" : "hecho") : "hecho";
  if(iso>h) return "todavía no";
  if(iso===h && estadoActs()==="cargando") return "mirando…";
  if(x.plan) return (iso===h ? "pendiente" : "no hecho")+(x.plan.s>1 ? " · "+x.plan.h+" de "+x.plan.s : "");
  return iso===h ? "pendiente" : "no hecho";
}
function puedeMarcar(x,iso,h){ return x.regla.tipo==="manual" && fase(iso)==="temporada" && iso<=h && !S.soloLectura; }
function toca(x,iso,repinta){
  if(!marcaCheck(S.D,iso,x.regla.id,!x.ok,hoy()).error){ guarda(); repinta(); }
}
function etiquetaCk(x,iso,h){ return x.regla.nombre+": "+estadoTxt(x,iso,h)+(puedeMarcar(x,iso,h) ? ". Toca para cambiar" : ""); }
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
function chip(x,iso,h,repinta){
  var auto=x.regla.tipo==="auto";
  var b=el(auto?"span":"button","arcChip"+(auto?" auto":"")+(x.ok?" on":""),
    ico(x.ok ? "check-circle" : icoRegla(x.regla))+'<span>'+esc(x.regla.nombre)+(auto ? " · "+esc(estadoTxt(x,iso,h)) : "")+'</span>');
  b.setAttribute("aria-label",etiquetaCk(x,iso,h));
  if(auto){ b.setAttribute("role","img"); return b; }
  b.setAttribute("aria-pressed",x.ok?"true":"false");
  if(!puedeMarcar(x,iso,h)) b.disabled=true;
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
function anillos(e,iso,h,repinta,grande){
  var w=el("div","arcAn"+(grande?" grande":""));
  e.reglas.forEach(function(x){
    var manual=puedeMarcar(x,iso,h), it=el(manual?"button":"div","",anillo(x)+'<small>'+esc(x.regla.nombre)+'</small>');
    it.setAttribute("aria-label",etiquetaCk(x,iso,h));
    if(manual){ it.setAttribute("aria-pressed",x.ok?"true":"false"); it.addEventListener("click",function(){ toca(x,iso,repinta); }); }
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
  return e.estado==="cumplido" ? "cumplido" : e.estado==="fallado" ? "sin cerrar, "+e.hechas+" de "+e.cuentan
       : e.estado==="hoy" ? "hoy, "+e.hechas+" de "+e.cuentan : e.estado==="futuro" ? "todavía no" : "sin datos";
}
function avisoFallos(iso,h){
  if(iso!==h || fase(h)!=="temporada") return null;
  var n=fallosSeguidos(S.D,h,ctx()); if(n<2) return null;
  var a=el("p","arcAviso",ico("warning-circle")+'<span>'+n+' días seguidos sin cerrar. No se reinicia nada: hoy cuenta igual.</span>');
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
  var h=hoy(), f=fase(iso), D=S.D, d=diseno();
  if(!f) return {};
  function rep(){ if(P.repinta) P.repinta(); }
  // prologo y temporada sin reglas: una fila igual en los cuatro disenos
  if(f==="prologo" || !D.reglas.length){
    var b=el("section","arcV arcBloque"), txt;
    if(f==="prologo"){
      var falta=entre(h,INICIO);
      txt = !D.reglas.length ? "Sin reglas. Pon de "+MIN_REGLAS+" a "+MAX_REGLAS+" antes del 1 de octubre."
          : D.reglas.length<MIN_REGLAS ? "Faltan "+plural(MIN_REGLAS-D.reglas.length,"regla")+". Se bloquean el 1 de octubre."
          : falta>0 ? "Empieza en "+plural(falta,"día")+(D.objetivo ? " · "+D.objetivo : "") : "Empieza hoy";
    }else txt="Sin reglas: la temporada no tiene nada que contar.";
    var ab=el("button","arcAbre",'<span><span class="arcL">'+(f==="prologo"?"Arc · Prólogo":"Arc · "+cabDia(estadoDia(D,iso,h,ctx())))+'</span>'+
      '<span class="arcT" style="display:block;margin-top:4px">'+esc(txt)+'</span></span>'+ico("caret-right"));
    ab.style.minHeight="64px"; ab.addEventListener("click",abre()); b.appendChild(ab);
    var ea=el("div"); avisosEstado(ea); if(ea.childNodes.length) b.appendChild(ea);
    return { despues:b };
  }
  var e=estadoDia(D,iso,h,ctx()), o={};
  if(d==="A"){
    var a=el("div","arcV arcA"), cab=el("button","arcAbre",'<span class="arcL">Arc · '+esc(cabDia(e))+'</span>'+ico("caret-right"));
    cab.addEventListener("click",abre()); a.appendChild(cab);
    a.appendChild(anillos(e,iso,h,rep,false));
    var fa=avisoFallos(iso,h); if(fa) a.appendChild(fa);
    var ea2=el("div"); avisosEstado(ea2); if(ea2.childNodes.length) a.appendChild(ea2);
    o.tarjeta=a;
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
    var d=mas(lun,k), dentro=fase(d)==="temporada", e=dentro ? estadoDia(S.D,d,h,ctx()) : null;
    var it=el(P.irA && dentro ? "button" : "div","", '<i>'+L[k]+'</i>'+(e ? punto(e,d,h) : '<svg viewBox="0 0 22 22" aria-hidden="true"></svg>'));
    it.setAttribute("aria-label",larga(d)+": "+(e ? textoDia(e) : "fuera de la temporada"));
    if(P.irA && dentro) (function(dd){ it.addEventListener("click",function(){ P.irA(dd); }); })(d);
    w.appendChild(it);
  }
  return w;
}

/* ----------------------------- la pantalla ----------------------------- */
function seccion(w,tit,id){ var s=el("section"); if(id) s.id=id; s.appendChild(el("h3","arcL",esc(tit))); w.appendChild(s); return s; }
function contador(s,R){
  s.appendChild(el("div","arcCont",'<span class="arcN">'+R.cumplidos+'</span><span class="arcT">'+(R.cumplidos===1?"día cumplido":"días cumplidos")+'</span>'));
  s.appendChild(el("p","arcS",R.dias ? "Solo suman: un fallo no resta ninguno. Van "+plural(R.dias,"día contado","días contados")+" (hoy entra al cerrarlo)."
                                     : "Solo suman: un fallo no resta ninguno."));
}
function barras(por){
  var w=el("div");
  por.forEach(function(p){
    w.appendChild(el("div","arcBar",'<span>'+esc(p.regla.nombre)+'</span><em>'+(p.pct==null ? "sin días todavía" : p.ok+"/"+p.total+" · "+p.pct+" %")+'</em>'+
      '<div><i style="width:'+(p.pct||0)+'%"></i></div>'));
  });
  return w;
}
function pinta(c){
  if(!P || !S){ c.innerHTML='<p class="arcS">Arc no ha arrancado. Cierra la app y vuelve a abrirla.</p>'; return; }
  var sc=c.scrollTop, h=hoy(), D=S.D, f=fase(h), d=diseno(), k=ctx();
  c.innerHTML=""; var w=el("div","arcV"); w.id="arcP"; w.setAttribute("data-d",d); c.appendChild(w);
  function repinta(){ pinta(c); }
  var est=el("div"); avisosEstado(est); if(est.childNodes.length){ var se=el("section"); se.appendChild(est); w.appendChild(se); }
  pintaObjetivo(w,h,repinta);
  if(h<INICIO) pintaPrologoIntro(w,h);
  else if(!D.reglas.length){
    var sv=seccion(w,"Temporada"); sv.appendChild(el("div","arcCaja arcVacio",'<p class="arcT">Sin reglas</p><p class="arcS">La temporada empezó sin reglas, así que no hay nada que contar. Las reglas se bloquearon el 1 de octubre.</p>'));
  }else{
    var R=resumen(D,h,k), e=estadoDia(D, f==="temporada" ? h : FIN, h, k);
    var s=seccion(w, f==="temporada" ? cabDia(e) : "Temporada cerrada");
    contador(s,R);
    var fa=avisoFallos(h,h); if(fa) s.appendChild(fa);
    if(d==="A") heroA(s,e,h,repinta);
    else if(d==="B") heroB(s,e,h,repinta);
    else if(d==="C") heroC(s,h,repinta);
    else heroD(w,s,h,repinta);
    if(d!=="D"){ var sr=seccion(w,"Por regla"); sr.appendChild(barras(R.porRegla)); }
    pintaRevision(w,h,k);
  }
  pintaReglas(w,h,repinta);
  pintaPrologo(w,h);
  pintaDiseno(w,repinta);
  c.scrollTop=sc;
  if(irRev){ irRev=false; var r=document.getElementById("arcRev"); if(r) r.scrollIntoView(); }
}
function heroA(s,e,h,repinta){
  if(fase(h)!=="temporada") return;
  var cj=el("div","arcCaja"); cj.style.marginTop="12px";
  cj.appendChild(el("p","arcL","Hoy"));
  cj.appendChild(anillos(e,h,h,repinta,true));
  s.appendChild(cj);
}
function heroB(s,e,h,repinta){
  var cj=el("div","arcCaja"); cj.style.marginTop="12px";
  cj.appendChild(el("p","arcS","Cada regla sale en la línea del día a su hora. La hora solo la coloca: no cambia lo que cuenta."));
  e.reglas.forEach(function(x){
    var f=el("div","arcFila");
    var inp=el("input","arcHora"); inp.type="time"; inp.value=x.regla.ancla||""; inp.setAttribute("aria-label","Hora de "+x.regla.nombre);
    if(S.soloLectura) inp.disabled=true;
    inp.addEventListener("change",function(){ if(!ponAncla(S.D,x.regla.id,inp.value).error) guarda(); });
    f.appendChild(inp);
    if(fase(h)==="temporada") f.appendChild(check(x,h,h,repinta));
    f.appendChild(el("span","",'<span class="arcT">'+esc(x.regla.nombre)+'</span><span class="arcS">'+esc(fase(h)==="temporada" ? estadoTxt(x,h,h) : subRegla(x.regla))+'</span>'));
    cj.appendChild(f);
  });
  s.appendChild(cj);
}
function heroC(s,h,repinta){
  var cj=el("div","arcCaja"); cj.style.marginTop="12px";
  if(fase(h)==="temporada"){
    var e=estadoDia(S.D,h,h,ctx()), ch=el("div","arcChips");
    e.reglas.forEach(function(x){ ch.appendChild(chip(x,h,h,repinta)); });
    cj.appendChild(el("p","arcL","Hoy")); cj.appendChild(ch);
  }
  var t=el("div","arcTabla"), L=["L","M","X","J","V","S","D"], i;
  t.appendChild(el("i",""," ")); for(i=0;i<7;i++) t.appendChild(el("i","",L[i]));
  var d=mas(INICIO,-diaSem(INICIO)), k=ctx();
  while(d<=FIN){
    var sem=semanaDe(d<INICIO?INICIO:d);
    t.appendChild(el("b","","S"+sem.n));
    for(i=0;i<7;i++,d=mas(d,1)){
      if(fase(d)!=="temporada"){ t.appendChild(el("span")); continue; }
      var e2=estadoDia(S.D,d,h,k), sp=el("span","",punto(e2,d,h));
      sp.setAttribute("role","img"); sp.setAttribute("aria-label",larga(d)+": "+textoDia(e2));
      t.appendChild(sp);
    }
  }
  cj.appendChild(el("p","arcL","Las 13 semanas")).style.marginTop = fase(h)==="temporada" ? "16px" : "0";
  cj.appendChild(t);
  cj.appendChild(el("p","arcS","Punto lleno: día cumplido. Arco: la parte de las reglas que se hizo."));
  s.appendChild(cj);
}
function heroD(w,s,h,repinta){
  // 13 semanas en filas (la 1 ocupa dos: del jueves 1 al domingo 11) y 7 dias en columnas
  var k=ctx(), g=el("div","arcGrid"), L=["L","M","X","J","V","S","D"], i;
  if(!selDia || fase(selDia)!=="temporada") selDia = fase(h)==="temporada" ? h : null;
  g.appendChild(el("i",""," ")); for(i=0;i<7;i++) g.appendChild(el("i","",L[i]));
  var d=mas(INICIO,-diaSem(INICIO));
  while(d<=FIN){
    var sem=semanaDe(d<INICIO?INICIO:d);
    g.appendChild(el("b","","S"+sem.n));
    for(i=0;i<7;i++,d=mas(d,1)){
      if(fase(d)!=="temporada"){ g.appendChild(el("span","","")).style.border="0"; continue; }
      var e=estadoDia(S.D,d,h,k), b=el("button",e.estado+(d===h?" hoy":"")+(d===selDia?" sel":""),String(+d.split("-")[2]));
      b.setAttribute("aria-label",larga(d)+": "+textoDia(e));
      (function(dd){ b.addEventListener("click",function(){ selDia=dd; repinta(); }); })(d);
      g.appendChild(b);
    }
  }
  // sin caja: la cuadricula usa todo el ancho (celdas de 44 px de alto)
  s.appendChild(g);
  s.appendChild(el("p","arcS","Relleno: día cumplido. Gris: sin cerrar. Con borde: por llegar. Toca un día para verlo."));
  if(selDia){
    var e2=estadoDia(S.D,selDia,h,k), dj=el("div","arcCaja"); dj.style.marginTop="12px";
    dj.appendChild(el("p","arcT",esc(mayus(larga(selDia)))));
    dj.appendChild(el("p","arcS",esc(cabDia(e2)+" · "+(selDia>h ? "todavía no ha llegado" : e2.hechas+" de "+e2.cuentan))));
    var ch=el("div","arcChips"); e2.reglas.forEach(function(x){ ch.appendChild(chip(x,selDia,h,repinta)); }); dj.appendChild(ch);
    s.appendChild(dj);
  }
  var sr=seccion(w,"Por regla"); sr.appendChild(barras(resumen(S.D,h,k).porRegla));
}
function pintaPrologoIntro(w,h){
  var s=seccion(w,"Prólogo"), falta=entre(h,INICIO);
  s.appendChild(el("p","arcT","La temporada empieza el jueves 1 de octubre"+(falta>0 ? ", en "+plural(falta,"día") : "")+"."));
  s.appendChild(el("p","arcS","Hasta el 30 de septiembre puedes cambiar el objetivo y las reglas. Desde el día 1, las reglas quedan fijas y los días cumplidos solo suman."));
}
function pintaObjetivo(w,h,repinta){
  var s=seccion(w,"Objetivo del Arc"), D=S.D, ed=objetivoEditable(D,h) && !S.soloLectura;
  if(!ed){ s.appendChild(el("p","arcT",esc(D.objetivo))); return; }
  var t=el("textarea"); t.id="arcObj"; t.value=D.objetivo; t.maxLength=MAX_OBJETIVO; t.rows=2;
  t.setAttribute("aria-label","Objetivo del Arc");
  var tm=null;
  function fija(){ clearTimeout(tm); if(!ponObjetivo(S.D,t.value,hoy()).error) guarda(); }
  t.addEventListener("input",function(){ clearTimeout(tm); tm=setTimeout(fija,500); });
  t.addEventListener("blur",fija);
  s.appendChild(t);
  s.appendChild(el("p","arcS",!String(D.objetivo).trim() ? "Uno solo, en una frase. Se fija el 1 de octubre." : "Se fija el 1 de octubre."));
}
function pintaRevision(w,h,k){
  var L=revision(S.D,h,k).reverse();
  if(!L.length) return;
  var s=seccion(w,"Revisión semanal","arcRev");
  L.forEach(function(r){
    var cj=el("div","arcCaja");
    cj.appendChild(el("p","arcT","Semana "+r.n+" · "+corta(r.desde)+" – "+corta(r.hasta)));
    if(!r.abierta){
      cj.appendChild(el("p","arcS","En curso: "+plural(r.cumplidos,"día cumplido","días cumplidos")+" de "+r.dias+". Se revisa el "+DIAS_L[diaSem(r.hasta)]+" "+corta(r.hasta)+"."));
      s.appendChild(cj); return;
    }
    cj.appendChild(el("p","arcS",r.cumplidos+" de "+r.dias+" días cumplidos"+(r.pasada ? "" : " · hoy toca revisarla")));
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
function pintaPrologo(w,h){
  var s=seccion(w,"Prólogo · septiembre");
  s.appendChild(el("p","arcS","Solo lectura. Sale lo que registraron el calendario, Strava y Hevy desde el 31/08; las reglas manuales no cuentan aquí."));
  var k=ctx(), cj=el("div","arcCaja"); cj.style.marginTop="12px";
  if(!S.D.reglas.length) cj.appendChild(el("p","arcS","Sin reglas no hay nada que mirar."));
  else if(!hayAuto()) cj.appendChild(el("p","arcS","Todas las reglas son manuales: el prólogo no tiene nada que enseñar."));
  else if(estadoActs()==="cargando" && !k.acts.length){ cj.appendChild(el("div","arcSkel")); cj.appendChild(el("div","arcSkel")); }
  else{
    var R=resumenPrologo(S.D,h,k);
    cj.appendChild(el("p","arcT",R.cumplidos+" de "+R.dias+" días con todo lo automático hecho"));
    cj.appendChild(barras(R.porRegla.filter(function(p){ return p.regla.tipo==="auto"; })));
  }
  // calendario de septiembre en gris
  var g=el("div","arcCal"), L=["L","M","X","J","V","S","D"], i;
  for(i=0;i<7;i++) g.appendChild(el("i","",L[i]));
  for(i=0;i<diaSem(PROLOGO);i++) g.appendChild(el("span","no"));
  for(var d=PROLOGO; d<INICIO; d=mas(d,1)){
    var e=estadoDia(S.D,d,h,k), sp=el("span",e.estado==="cumplido"?"si":"",String(+d.split("-")[2]));
    sp.setAttribute("role","img"); sp.setAttribute("aria-label",larga(d)+": "+(e.estado==="cumplido" ? "todo lo automático hecho" : e.estado==="futuro" ? "todavía no" : "no"));
    g.appendChild(sp);
  }
  cj.appendChild(g);
  s.appendChild(cj);
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
var DESC={ A:"Anillos en la tarjeta del día", B:"Cada regla en la línea del día, a su hora", C:"Cabecera de temporada y la semana en puntos", D:"Fila compacta en HOY y la cuadrícula aquí" };
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
  var h=hoy(), f=fase(h);
  if(f==="temporada") return "Día "+diaArc(h)+"/"+TOTAL+" · Semana "+semanaArc(h);
  if(f==="prologo") return "Prólogo · empieza el 1 de octubre";
  return h<PROLOGO ? "Empieza el 1 de octubre" : "Temporada cerrada";
}

return {
  // datos y reglas del calendario (los usan los tests)
  VERSION_DATOS:VERSION_DATOS, K_DATOS:K_DATOS, K_DISENO:K_DISENO, PROLOGO:PROLOGO, INICIO:INICIO, FIN:FIN, EDITA_HASTA:EDITA_HASTA,
  TOTAL:TOTAL, SEMANAS:SEMANAS, MIN_REGLAS:MIN_REGLAS, MAX_REGLAS:MAX_REGLAS, DISENOS:DISENOS, DISENO_DEF:DISENO_DEF,
  fase:fase, diaArc:diaArc, semanaArc:semanaArc, editable:editable, mas:mas, preset:preset,
  vacio:vacio, migra:migra, carga:carga, guardaEn:guardaEn, leeDiseno:leeDiseno, guardaDiseno:guardaDiseno,
  planDelDia:planDelDia, registraAuto:registraAuto, estadoDia:estadoDia, fallosSeguidos:fallosSeguidos,
  resumen:resumen, resumenPrologo:resumenPrologo, revision:revision,
  anadeRegla:anadeRegla, editaRegla:editaRegla, borraRegla:borraRegla, marcaCheck:marcaCheck, ponNota:ponNota,
  ponAncla:ponAncla, ponObjetivo:ponObjetivo, objetivoEditable:objetivoEditable,
  // lo que usa la agenda
  conecta:conecta, registra:registra, vista:vista, pinta:pinta, subtitulo:subtitulo, diseno:diseno
};
});
