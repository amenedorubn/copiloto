/* Pasos de entreno que piden algo al corredor a mitad de camino.

   Un entreno puede llevar, ademas de sus tramos, una lista de "pasos":

   { tipo:"decision", id, en (m), antes (m), espera_s, aviso (texto con {m}),
     opciones:[ { id, etiqueta, voz, sigue? }, { id, etiqueta, voz, seguro:true } ] }
       Pregunta cuando faltan "antes" metros para "en". Las dos opciones salen
       como botones. Si no hay respuesta en "espera_s", se elige SIEMPRE la opcion
       "seguro" (la que no pide esfuerzo). No se puede configurar otra: valida()
       rechaza una decision cuya opcion segura lleve "sigue".

   { tipo:"intervalos", id, desde (m), n, trabajo_s, trote_s,
     objetivo (s/km, constante), techo (s/km, constante), cadencia:{min,max} (ciclos por pie y minuto) }
       Se arma solo si la opcion elegida lo nombra en "sigue". Cuenta atras,
       n repeticiones de trabajo_s con trote_s entre ellas. En 20 s el ritmo GPS
       no se estabiliza: la guia es la cadencia (y un metronomo) y el ritmo solo
       sirve para el techo ("frena un poco"). No usa la frecuencia cardiaca.

   Este modulo no toca el motor GPS: recibe lo que necesita en "io".
     io.ahora()        ms            io.dist()          m recorridos (km del plan)
     io.aviso(txt)     pitido + voz  io.habla(txt)      solo voz
     io.registra(q,x)  diario        io.decision(reg)   guarda la decision (valor y hora)
     io.ritmoRapido()  s/km de los ultimos ~5 s (NaN si no hay)
     io.cadencia()     ciclos/min medidos (NaN si no hay sensor)
     io.metronomo(on, pasosPorMin)   io.gpsOk()  (solo para avisar en pantalla; todo opcional salvo ahora/dist/aviso/habla)
   El estado (estado()/restaura()) es JSON: sobrevive a que Android mate la pestana. */
(function(root){
"use strict";

var CUENTA_S = 6;          // la frase "rapido pero controlado... tres, dos, uno, ya" dura ~5 s
var CUENTA_CORTA_S = 3;    // las repeticiones siguientes: solo "tres, dos, uno, ya"
var ARRANQUE_RITMO_S = 6;  // s dentro de la repeticion antes de mirar el ritmo (el GPS tarda en llegar)
var ARRANQUE_CAD_S = 8;    // y la cadencia
var MAX_ARRANQUE_M = 300;  // si el GPS vuelve mas alla de esto despues del km, las rectas ya no se empiezan

function num(v){ return typeof v==="number" && isFinite(v); }
function dicePace(s){ s=Math.round(s); var m=Math.floor(s/60), g=s%60; return m+" "+(g===0?"justos":(g<10?"cero "+g:g)); }
function paceTxt(s){ s=Math.round(s); return Math.floor(s/60)+"'"+String(s%60).padStart(2,"0")+"\""; }

// ---------------------------------------------------------------- modelo
function valida(pasos){
  var errs=[], ids={};
  (pasos||[]).forEach(function(p){
    if(!p || !p.id){ errs.push("paso sin id"); return; }
    if(ids[p.id]) errs.push("id repetido: "+p.id); ids[p.id]=p;
  });
  (pasos||[]).forEach(function(p){
    if(!p || !p.id) return;
    if(p.tipo==="decision"){
      if(!num(p.en) || !num(p.antes) || p.antes<=0) errs.push(p.id+": falta en/antes");
      if(!num(p.espera_s) || p.espera_s<=0) errs.push(p.id+": espera_s debe ser > 0");
      var o=p.opciones||[], seg=o.filter(function(x){ return x.seguro; });
      if(o.length!==2) errs.push(p.id+": una decision lleva exactamente dos opciones");
      if(seg.length!==1) errs.push(p.id+": tiene que haber exactamente una opcion segura");
      seg.forEach(function(x){ if(x.sigue) errs.push(p.id+": la opcion segura no puede arrancar un esfuerzo (sigue)"); });
      o.forEach(function(x){ if(x.sigue && !(ids[x.sigue] && ids[x.sigue].tipo==="intervalos")) errs.push(p.id+": sigue apunta a un paso que no existe"); });
    }else if(p.tipo==="intervalos"){
      if(!(p.n>=1) || !(p.trabajo_s>0) || !(p.trote_s>=0)) errs.push(p.id+": n, trabajo_s o trote_s mal");
      if(!(p.objetivo>p.techo)) errs.push(p.id+": el objetivo (s/km) tiene que ser mas lento que el techo");
      if(!p.cadencia || !(p.cadencia.min<=p.cadencia.max)) errs.push(p.id+": cadencia min/max mal");
    }else errs.push(p.id+": tipo desconocido ("+p.tipo+")");
  });
  return errs;
}

// la plantilla de "rectas con decision" (objetivo y techo configurables)
function plantillaRectas(o){
  o=o||{};
  var n=o.n||4, tr=o.trabajo_s||20, tt=o.trote_s||60, en=o.en||10000, antes=o.antes||200;
  var objetivo=o.objetivo||260, techo=o.techo||245, cad=o.cadencia||{ min:85, max:88 };
  var id=o.id||"rectas";
  return [
    { tipo:"decision", id:id+"-decision", en:en, antes:antes, espera_s:o.espera_s||15,
      aviso:"En {m} metros: ¿haces "+n+" rectas? Toca en pantalla.",
      opciones:[
        { id:"si", etiqueta:"Sí, "+n+" rectas", voz:"Vale, "+n+" rectas desde el kilómetro "+(en/1000).toString().replace(".",",")+".", sigue:id },
        { id:"no", etiqueta:"No, seguir suave", seguro:true, voz:"Vale, seguimos suave.",
          voz_defecto:"No he oído respuesta: seguimos suave." }
      ] },
    { tipo:"intervalos", id:id, desde:en, n:n, trabajo_s:tr, trote_s:tt, objetivo:objetivo, techo:techo, cadencia:cad,
      voz_ritmo:"Rápido pero controlado, no sprint.",
      voz_fin:"Para. Rectas hechas. Vuelves al suave." }
  ];
}

// ---------------------------------------------------------------- estado
function nuevoEstado(pasos){
  var E={ dec:{}, int:{} };
  (pasos||[]).forEach(function(p){
    if(p.tipo==="decision") E.dec[p.id]={ estado:"espera" };
    if(p.tipo==="intervalos") E.int[p.id]={ estado:"inactivo" };
  });
  return E;
}

function crea(pasos, io, previo){
  pasos=pasos||[];
  var errs=valida(pasos);
  if(errs.length) throw new Error("Pasos mal definidos: "+errs.join("; "));
  var E=previo ? JSON.parse(JSON.stringify(previo)) : nuevoEstado(pasos);
  var porId={}; pasos.forEach(function(p){ porId[p.id]=p; });

  function reg(q,x){ if(io.registra) io.registra(q,x); }
  function seguraDe(D){ return D.opciones.filter(function(o){ return o.seguro; })[0]; }
  function opcion(D,id){ return D.opciones.filter(function(o){ return o.id===id; })[0]; }
  function iso(ms){ return new Date(ms).toISOString(); }

  // ---------------------------------------------------- decision
  function resuelve(D,S,valor,origen,t,txtVoz){
    var op=opcion(D,valor), d=io.dist();
    S.estado="resuelta"; S.valor=valor; S.origen=origen; S.t=t; S.hora=iso(t); S.km=Math.round(d)/1000;
    S.etiqueta=op.etiqueta;
    var rec={ id:D.id, valor:valor, etiqueta:op.etiqueta, origen:origen, hora:S.hora, km:S.km };
    reg("decision", D.id+": "+valor+" ("+({ toque:"tocado", tiempo:"sin respuesta en "+D.espera_s+" s", gps:"sin GPS en el punto", salto:"se llegó ya pasado el punto" }[origen]||origen)+")");
    if(io.decision) io.decision(rec);
    if(op.sigue){
      var I=E.int[op.sigue]; if(I && I.estado==="inactivo") I.estado="armado";
    }
    if(txtVoz) io.aviso(txtVoz);
  }
  function pregunta(D,S,t,d){
    S.estado="pregunta"; S.t0=t; S.hasta=t+D.espera_s*1000;
    var rest=D.en-d, m = rest>=170 ? 200 : Math.max(10,Math.round(rest/10)*10);
    S.texto=D.aviso.replace("{m}",String(m));
    reg("decision", D.id+": pregunta a "+Math.round(d)+" m");
    io.aviso(S.texto);
  }
  function tickDecision(D,S,t,d,prev){
    if(S.estado==="espera"){
      if(d>=D.en){                         // se paso el punto sin preguntar
        // si el km venia andando y de golpe salta mas de 60 m, el GPS se habia perdido en el punto;
        // si es el primer dato (se empezo ya pasado) no hay nada que contar
        var perdido = typeof prev==="number" && d-prev>60;
        resuelve(D,S,seguraDe(D).id,perdido?"gps":"salto",t,
                 perdido ? "Sin GPS en el punto de decisión: sigo suave." : "");
        return;
      }
      if(d>=D.en-D.antes) pregunta(D,S,t,d);
    }else if(S.estado==="pregunta"){
      if(t>=S.hasta) resuelve(D,S,seguraDe(D).id,"tiempo",t,seguraDe(D).voz_defecto||seguraDe(D).voz);
    }
  }
  // el toque en un boton; devuelve false si ya no se podia (ya resuelta o sin preguntar)
  function responde(id,valor){
    var D=porId[id], S=D && E.dec[id];
    if(!D || !S || S.estado!=="pregunta" || !opcion(D,valor)) return false;
    resuelve(D,S,valor,"toque",io.ahora(),opcion(D,valor).voz);
    return true;
  }

  // ---------------------------------------------------- intervalos
  function arrancaCuenta(P,I,t,corta){
    I.estado="cuenta"; I.t0=t; I.dur=(corta?CUENTA_CORTA_S:CUENTA_S)*1000;
    I.frena=false; I.cad=false;
    var txt = corta ? "Otra. Tres, dos, uno, ya." : (P.voz_ritmo||"")+" Tres, dos, uno, ya.";
    io.habla(txt.trim());
    reg("rectas", "cuenta atrás de la repetición "+(I.i+1)+" de "+P.n);
  }
  function tickIntervalos(P,I,t,d){
    var es=I.estado;
    if(es==="inactivo"||es==="fin") return;
    if(es==="armado"){
      if(d<P.desde) return;
      if(d>P.desde+MAX_ARRANQUE_M){        // el GPS volvio muy tarde: no se empieza a mitad de nada
        I.estado="fin"; I.cancelada="gps";
        reg("rectas","canceladas: se llegó a "+Math.round(d)+" m sin GPS");
        io.aviso("Sin GPS no he podido empezar las rectas: sigo suave.");
        return;
      }
      I.i=0; I.rep=[]; arrancaCuenta(P,I,t,false); return;
    }
    if(es==="cuenta"){
      if(t-I.t0<I.dur) return;
      I.estado="trabajo"; I.tt=t; I.dTrabajo=d; I.racha=0; I.rep[I.i]={ ini:t, d0:d };
      if(io.metronomo) io.metronomo(true, Math.round((P.cadencia.min+P.cadencia.max)/2*2));
      reg("rectas","repetición "+(I.i+1)+" de "+P.n+" · ya");
      return;
    }
    if(es==="trabajo"){
      var seg=(t-I.tt)/1000;
      // techo: el ritmo suavizado va mas rapido que el techo (s/km menor)
      if(!I.frena && seg>=ARRANQUE_RITMO_S){
        var r=io.ritmoRapido ? io.ritmoRapido() : NaN;
        if(num(r) && r<P.techo){ if(++I.racha>=2){ I.frena=true; io.habla("Frena un poco."); reg("rectas","frena un poco: "+paceTxt(r)+" a "+(Math.round(seg))+" s"); } }
        else I.racha=0;
      }
      // cadencia medida fuera de banda (con margen de 3)
      if(!I.cad && !I.frena && seg>=ARRANQUE_CAD_S && io.cadencia){
        var c=io.cadencia();
        if(num(c) && (c<P.cadencia.min-3 || c>P.cadencia.max+3)){
          I.cad=true; io.habla(c<P.cadencia.min ? "Sube la cadencia." : "Baja la cadencia.");
          reg("rectas","cadencia "+Math.round(c)+" fuera de "+P.cadencia.min+"–"+P.cadencia.max);
        }
      }
      if(seg>=P.trabajo_s){
        if(io.metronomo) io.metronomo(false);
        I.rep[I.i].fin=t; I.rep[I.i].d1=d;
        I.i++;
        if(I.i>=P.n){ I.estado="fin"; reg("rectas","hechas las "+P.n); io.aviso(P.voz_fin||"Rectas hechas."); }
        else{ I.estado="trote"; I.tr=t; io.habla("Para. Trote suave. Quedan "+(P.n-I.i)+"."); }
      }
      return;
    }
    if(es==="trote"){
      var st=(t-I.tr)/1000, lead=CUENTA_CORTA_S;
      if(st>=P.trote_s-lead) arrancaCuenta(P,I,t,true);   // la cuenta atras cae dentro del trote: de "ya" a "ya" pasan trote_s + trabajo_s
      return;
    }
  }

  function tick(){
    var t=io.ahora(), d=io.dist(), prev=E.ult;
    pasos.forEach(function(p){
      if(p.tipo==="decision") tickDecision(p,E.dec[p.id],t,d,prev);
    });
    pasos.forEach(function(p){
      if(p.tipo==="intervalos") tickIntervalos(p,E.int[p.id],t,d);
    });
    E.ult=d;
  }

  // para pintar: lo que hay que ensenar ahora
  function vista(){
    var t=io.ahora(), v=null;
    pasos.forEach(function(p){
      if(p.tipo==="decision"){
        var S=E.dec[p.id];
        if(S.estado==="pregunta")
          v={ fase:"pregunta", id:p.id, texto:S.texto, restan_s:Math.max(0,Math.ceil((S.hasta-t)/1000)), espera_s:p.espera_s,
              frac:Math.max(0,Math.min(1,(S.hasta-t)/(p.espera_s*1000))),
              opciones:p.opciones.map(function(o){ return { id:o.id, etiqueta:o.etiqueta, seguro:!!o.seguro }; }),
              sinGps: io.gpsOk ? !io.gpsOk() : false };
      }
    });
    if(v) return v;
    pasos.forEach(function(p){
      if(p.tipo!=="intervalos") return;
      var I=E.int[p.id];
      if(I.estado==="armado") v={ fase:"armada", id:p.id, n:p.n, faltan_m:Math.max(0,Math.round(p.desde-io.dist())) };
      else if(I.estado==="cuenta") v={ fase:"cuenta", id:p.id, i:I.i, n:p.n, resta_s:Math.max(0,Math.ceil((I.dur-(t-I.t0))/1000)) };
      else if(I.estado==="trabajo") v={ fase:"trabajo", id:p.id, i:I.i, n:p.n, resta_s:Math.max(0,Math.ceil(p.trabajo_s-(t-I.tt)/1000)),
                                        frac:Math.min(1,(t-I.tt)/1000/p.trabajo_s), objetivo:p.objetivo, techo:p.techo, cadencia:p.cadencia };
      else if(I.estado==="trote") v={ fase:"trote", id:p.id, i:I.i, n:p.n, resta_s:Math.max(0,Math.ceil(p.trote_s-(t-I.tr)/1000)) };
      else if(I.estado==="fin" && !I.cancelada) v=v||{ fase:"hecho", id:p.id, n:p.n };
    });
    return v;
  }
  // true mientras una cosa de estas habla o pide atencion: el motor calla sus cantos de km
  function ocupado(){
    var o=false;
    pasos.forEach(function(p){
      if(p.tipo==="decision" && E.dec[p.id].estado==="pregunta") o=true;
      if(p.tipo==="intervalos" && /^(cuenta|trabajo|trote)$/.test(E.int[p.id].estado)) o=true;
    });
    return o;
  }
  function decisionDe(id){ var S=E.dec[id]; return S && S.estado==="resuelta" ? JSON.parse(JSON.stringify(S)) : null; }
  function resumenDecision(idIntervalos){
    var txt="";
    pasos.forEach(function(p){
      if(p.tipo!=="decision") return;
      var S=E.dec[p.id]; if(S.estado!=="resuelta") return;
      var sig=p.opciones.filter(function(o){ return o.sigue===idIntervalos; })[0];
      if(!sig) return;
      var hh=new Date(S.t), hm=String(hh.getHours()).padStart(2,"0")+":"+String(hh.getMinutes()).padStart(2,"0");
      txt=S.etiqueta+" · "+({ toque:"tocado", tiempo:"sin respuesta", gps:"sin GPS", salto:"ya pasado" }[S.origen]||S.origen)+" a las "+hm;
      var I=E.int[idIntervalos];
      if(S.valor===sig.id) txt+=" · "+(I.cancelada ? "no se hicieron (sin GPS)" : I.estado==="fin" ? "rectas hechas" : (I.i||0)+" de "+porId[idIntervalos].n);
    });
    return txt;
  }

  // una pausa no cuenta: se corren los relojes lo que haya durado (y la decision que esperaba, igual)
  function desplaza(ms){
    if(!(ms>0)) return;
    Object.keys(E.dec).forEach(function(k){ var S=E.dec[k]; if(S.estado==="pregunta"){ S.t0+=ms; S.hasta+=ms; } });
    Object.keys(E.int).forEach(function(k){ var I=E.int[k];
      ["t0","tt","tr"].forEach(function(c){ if(typeof I[c]==="number") I[c]+=ms; }); });
  }
  return { tick:tick, desplaza:desplaza, responde:responde, vista:vista, ocupado:ocupado, decisionDe:decisionDe,
           resumenDecision:resumenDecision, pasos:pasos,
           estado:function(){ return JSON.parse(JSON.stringify(E)); },
           reinicia:function(){ E=nuevoEstado(pasos); if(io.metronomo) io.metronomo(false); },
           restaura:function(e){ if(e && e.dec && e.int) E=JSON.parse(JSON.stringify(e)); } };
}

// ---------------------------------------------------------------- cadencia
/* Pasos por minuto desde el acelerometro del movil (devicemotion, con gravedad).
   Se resta la media lenta, se buscan picos (un pico = un apoyo) separados al menos
   0,28 s y se mide el intervalo entre los de los ultimos ~8 s. Devuelve CICLOS por
   minuto (un pie: pasos/2), que es como se habla de cadencia aqui (85-88).
   Es una medida del movil en el bolsillo o el brazalete: orientativa.       */
function Cadencia(){
  var base=null, ult=null, ant=null, picos=[], amp=1.5, tUlt=-1e9, h1=0, h2=0;
  var MIN_ENTRE=280, VENTANA=8000;
  function alimenta(t,ax,ay,az){
    if(![t,ax,ay,az].every(num)) return;
    var m=Math.sqrt(ax*ax+ay*ay+az*az);
    if(base===null) base=m;
    var dt=ant===null ? 0.016 : Math.max(0.001,Math.min(0.2,(t-ant)/1000)); ant=t;
    base+=(m-base)*Math.min(1,dt/0.6);                 // media lenta (~0,6 s)
    var hp=m-base;
    var s=(hp+h1+h2)/3; h2=h1; h1=hp;                  // alisado corto
    amp=Math.max(0.8,amp*Math.pow(0.5,dt/4));           // el umbral baja solo si se calma la carrera
    // pico: el valor anterior supera al actual y al anterior a el, y es de verdad alto
    if(ult!==null && ult.s>0.45*amp && ult.s>s && ult.s>=ult.p && t-tUlt>=MIN_ENTRE){
      picos.push(ult.t); tUlt=ult.t; amp=Math.max(amp,ult.s);
      while(picos.length && t-picos[0]>VENTANA) picos.shift();
    }
    ult={ t:t, s:s, p:ult?ult.s:s };
    if(ult.s>amp) amp=ult.s;
  }
  function ciclos(ahora){
    var P=picos.filter(function(p){ return ahora-p<=VENTANA; });
    if(P.length<7) return NaN;
    var ms=(P[P.length-1]-P[0])/(P.length-1);
    return ms>0 ? 60000/ms/2 : NaN;
  }
  return { alimenta:alimenta, ciclos:ciclos, reinicia:function(){ base=null; ult=null; ant=null; picos=[]; amp=1.5; tUlt=-1e9; h1=h2=0; } };
}

root.Pasos={ crea:crea, valida:valida, plantillaRectas:plantillaRectas, Cadencia:Cadencia,
             dicePace:dicePace, paceTxt:paceTxt };
if(typeof module!=="undefined" && module.exports) module.exports=root.Pasos;
})(typeof window!=="undefined" ? window : globalThis);
