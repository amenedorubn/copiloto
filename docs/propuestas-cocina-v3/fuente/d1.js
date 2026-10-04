// D1 · estructura de la pestaña Cocina y qué pasa con Recetas
function filaComida(x, conBoton) {
  var der = x.e === "lista" && conBoton ? '<span class="btn ac min">' + ic("cooking-pot", "s") + "Cocinar</span>" : '<span class="mu">' + ic("caret-right", "s") + "</span>";
  return fila('<span class="h">' + x.h + "<br><span style=\"font-weight:600;font-size:12px\">" + x.q + "</span></span>", x.t,
    '<span style="display:inline-flex;gap:6px;align-items:center">' + estadoIc(x).replace('class="i', 'class="i s') + estadoTxt(x) + "</span>", der,
    x.e === "hecha" ? ' style="opacity:.55"' : "");
}
function nutriLinea() {
  return '<p class="ps" style="margin:4px 0 0">Fibra 21 / 25 g · Vit. C 45 / 110 mg · Folato 158 / 330 µg</p>';
}
function semanaLista(conNutri, conBoton, dias) {
  return (dias || SEMANA).map(function (d, i) {
    return '<div class="' + (i ? "g" : "g1") + '"><p class="cap">' + d.dia + "</p>" + (conNutri && i === 0 ? nutriLinea() : "") +
      '<div class="caja g0">' + d.items.map(function (x) { return filaComida(x, conBoton); }).join("") + "</div></div>";
  }).join("");
}

// A · Tres pestañas: Semana · Comprar · Casa. Recetas desaparece; la nutrición vive en la cabecera de cada día.
P.d1a = function () {
  return tel(cab("Cocina", "Plan, compra y casa") + seg(["Semana", "Comprar|9", "Casa"], 0), semanaLista(true, true));
};
// B · Cuatro pestañas: Recetas se convierte en «Comido» (nutrición del día y de la semana).
P.d1b = function () {
  return tel(cab("Cocina", "Plan, compra, casa y lo comido") + seg(["Semana", "Comprar|9", "Casa", "Comido"], 0), semanaLista(false, true));
};
// C · Sin pestañas: una sola línea de tiempo; Comprar y Casa son hojas que suben desde abajo.
P.d1c = function () {
  return tel(cab("Cocina", "Lo que toca y lo que falta"), semanaLista(true, true) ,
    pie('<span class="btn">' + ic("shopping-cart") + 'Comprar <span class="mu">9</span></span><span class="btn">' + ic("house") + 'Casa <span class="mu">34</span></span>'));
};
// D · «Ahora» primero: la comida siguiente a pantalla y barra de 4 abajo.
P.d1d = function () {
  return tel(cab("Cocina", "Lunes 5 · 13:40"),
    '<p class="cap g1">AHORA · COMIDA 14:00</p><div class="caja g0" style="padding:16px 14px"><div class="big">Pasta con tomate y atún</div>' +
    '<p class="ps" style="margin-top:6px">1 ración · 20 min en dos carriles · todo en casa</p>' +
    '<div class="g1">' + gantt(PASTA, null, { ley: false }) + "</div>" +
    '<div class="btn ac" style="margin-top:16px">' + ic("cooking-pot") + "Cocinar a las 13:40</div></div>" +
    '<p class="cap g">LUEGO</p><div class="caja g0">' + filaComida(SEMANA[0].items[2]) + filaComida(SEMANA[1].items[0]) + "</div>" +
    '<div class="tab"><span class="on">' + ic("cooking-pot") + "Ahora</span><span>" + ic("calendar-blank") + "Semana</span><span>" +
    ic("shopping-cart") + "Comprar</span><span>" + ic("house") + "Casa</span></div>");
};

// ---- estados de la recomendada (A) ----
P["d1a-cargando"] = function () {
  var sk = function (w) { return '<div class="fila"><span class="sk" style="width:44px;height:30px"></span><div class="t"><div class="sk" style="width:' + w + '%;height:16px"></div><div class="sk" style="width:40%;height:12px;margin-top:8px"></div></div></div>'; };
  return tel(cab("Cocina", "Plan, compra y casa") + seg(["Semana", "Comprar", "Casa"], 0),
    '<p class="ps g1" role="status">' + ic("arrows-clockwise", "s") + " Trayendo el calendario «Comidas»…</p>" +
    '<div class="caja g1">' + sk(70) + sk(55) + sk(80) + "</div>" + '<div class="caja g">' + sk(60) + sk(75) + "</div>");
};
P["d1a-vacio"] = function () {
  return tel(cab("Cocina", "Plan, compra y casa") + seg(["Semana", "Comprar", "Casa"], 0),
    '<div style="padding:120px 8px 0;text-align:center">' + ic("calendar-blank", "l") +
    '<p class="big" style="font-size:20px;margin-top:12px">No hay comidas esta semana</p>' +
    '<p class="ps" style="margin-top:8px">El calendario «Comidas» está vacío del lunes 5 al domingo 11. Cuando la Claude que planea las escriba, salen aquí con su compra.</p>' +
    '<div class="btn inv" style="margin-top:24px">' + ic("arrows-clockwise") + "Volver a mirar</div></div>");
};
P["d1a-error"] = function () {
  return tel(cab("Cocina", "Plan, compra y casa") + seg(["Semana", "Comprar|9", "Casa"], 0),
    '<div class="caja g1 aviso" role="alert">' + ic("cloud-slash") + '<div><p class="p">No llega el calendario</p>' +
    '<p class="ps">Sin conexión con el Worker. Ves la copia de hoy a las 09:12: si Claude cambió algo después, aún no está.</p>' +
    '<div class="btn min inv" style="margin-top:10px;display:inline-flex">' + ic("arrows-clockwise", "s") + "Reintentar</div></div></div>" +
    semanaLista(true, true, SEMANA.slice(0, 2)));
};
P["d1a-extremo"] = function () {
  var dia = [{ dia: "HOY · LUN 5", items: [
    { h: "07:15", q: "Antes", t: "Saca el tupper de lentejas del congelador a la nevera", e: "hecha" },
    { h: "08:00", q: "Desayuno", t: "Avena con plátano", e: "hecha" },
    { h: "11:00", q: "Media", t: "Yogur griego con nueces y miel", e: "hecha" },
    { h: "14:00", q: "Comida", t: "Pasta con tomate y atún", e: "lista", min: 20 },
    { h: "17:30", q: "Merienda", t: "Tostada de pan de centeno con aguacate, tomate, aceite y una pizca de sal en escamas", e: "falta", falta: "aguacate" },
    { h: "21:00", q: "Cena", t: "Crema de verduras con tostada", e: "falta", falta: "crema de verduras" }] }];
  return tel(cab("Cocina", "Plan, compra y casa") + seg(["Semana", "Comprar|14", "Casa"], 0),
    semanaLista(true, true, dia) + '<p class="ps g1">6 comidas hoy: las hechas se apagan y se quedan arriba.</p>');
};
