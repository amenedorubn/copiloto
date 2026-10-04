// D2 · paso a paso con carriles. Caso: pasta con tomate y atún, a los 1:40 (13:41:40).
function cabModo(tit, der, n) {
  return '<div class="cab"><span class="ib">' + ic("x") + '</span><div style="min-width:0"><small>Paso a paso · ' + (n || "2 carriles") + '</small><b style="font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
    tit + '</b></div><span class="der" style="font-size:13px;font-weight:700;color:var(--mu);padding-right:8px;white-space:nowrap">' + (der || "a la mesa 14:00") + "</span></div>";
}
function relojFila(icn, et, txt, t) {
  return '<div class="fila">' + ic(icn) + '<div class="t"><b>' + et + "</b><small>" + txt + '</small></div><span class="n" style="font-size:20px;font-weight:800">' + t + "</span></div>";
}
var hecho = pie('<span class="btn" style="flex:0 0 96px">' + ic("caret-left") + '</span><span class="btn inv">' + ic("check") + "Picado</span>");

// A · Pantalla partida arriba/abajo: un carril por mitad, cada uno con su reloj
P.d2a = function () {
  function mitad(icn, et, estado, reloj, sub, luego, manos) {
    return '<div class="caja" style="flex:1;display:flex;flex-direction:column;padding:16px">' +
      '<p class="cap' + (manos ? " ac" : "") + '" style="display:flex;gap:6px;align-items:center">' + ic(icn, "s") + et + (manos ? " · TUS MANOS" : " · ESPERA") + "</p>" +
      '<div class="big" style="margin-top:8px">' + estado + "</div>" +
      '<div style="display:flex;align-items:baseline;gap:10px;margin-top:10px"><span class="reloj">' + reloj + '</span><span class="ps">' + sub + "</span></div>" +
      '<p class="ps" style="margin-top:auto;padding-top:12px;border-top:1px solid var(--ln)">Luego · ' + luego + "</p></div>";
  }
  return tel(cabModo("Pasta con tomate y atún"),
    '<div style="display:flex;flex-direction:column;gap:12px;height:100%;padding-bottom:4px">' +
    mitad("drop", "AGUA", "Calentándose", "6:50", "hasta que hierva", "13:48 · echa la pasta, 9 min") +
    mitad("flame", "SALSA", "Pica cebolla y ajo", "1:50", "quedan", "13:43 · sofríe, 6 min", true) + "</div>", hecho);
};

// B · Columnas: cada carril, su lista de pasos con la hora; la unión abajo, a lo ancho
P.d2b = function () {
  function col(icn, et, reloj, pasos) {
    return '<div style="flex:1;min-width:0"><div class="caja" style="padding:12px"><p class="cap" style="display:flex;gap:6px;align-items:center">' + ic(icn, "s") + et + "</p>" +
      '<div class="big" style="margin-top:4px">' + reloj + "</div></div>" +
      pasos.map(function (p) {
        var on = p[2] === "on", ya = p[2] === "ya";
        return '<div style="padding:10px 12px;margin-top:8px;border-radius:14px;' + (on ? "background:var(--fg);color:var(--bg)" : "background:var(--sf)") + (ya ? ";opacity:.5" : "") + '">' +
          '<small style="display:block;font-size:12px;font-weight:700;opacity:.75">' + p[0] + "</small><b style=\"display:block;font-size:14px;font-weight:700;line-height:1.35\">" + p[1] + "</b></div>";
      }).join("") + "</div>";
  }
  return tel(cabModo("Pasta con tomate y atún"),
    '<div style="display:flex;gap:10px">' +
    col("drop", "AGUA", "6:50", [["13:40", "Olla con agua y sal al fuego", "ya"], ["13:48", "Echa la pasta · 9 min"], ["13:57", "Escurre"]]) +
    col("flame", "SALSA", "1:50", [["13:40", "Pica cebolla y ajo", "on"], ["13:43", "Sofríe · 6 min"], ["13:49", "Tomate · 8 min"], ["13:57", "Atún · 1 min"]]) +
    '</div><div class="caja g1" style="display:flex;gap:12px;align-items:center">' + ic("fork-knife") + '<div><b style="font-size:15px">13:59 · Mezcla y sirve</b><p class="ps">Los dos carriles acaban aquí</p></div></div>', hecho);
};

// C · «Ahora» y «luego» con mini-Gantt arriba (la recomendada)
function d2c(ahora, ahoraSub, quedan, pct, mientras, luego, extra, R, t, boton) {
  return tel(cabModo("Pasta con tomate y atún"),
    '<div class="caja">' + gantt(R || PASTA, t == null ? 100 : t) + "</div>" +
    '<p class="cap ac g">AHORA · TUS MANOS</p><div class="big g0">' + ahora + "</div>" +
    '<p class="ps" style="margin-top:4px">' + ahoraSub + "</p>" +
    (quedan ? '<div style="display:flex;align-items:center;gap:12px;margin-top:12px"><div class="barra" style="flex:1"><i style="width:' + pct + '%"></i></div><span class="reloj" style="font-size:28px">' + quedan + "</span></div>" : "") +
    '<p class="cap g">MIENTRAS</p><div class="caja g0" style="padding:4px 14px">' + mientras + "</div>" +
    '<p class="cap g">LUEGO</p>' + luego + (extra || ""), boton || hecho);
}
function luegoLinea(h, txt, sub) {
  return '<div class="fila" style="min-height:44px"><span class="h" style="width:48px;color:var(--fg)">' + h + '</span><div class="t"><b style="font-size:14px">' + txt + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</div></div>";
}
P.d2c = function () {
  return d2c("Pica cebolla y ajo", "Mientras el agua se calienta", "1:50", 39,
    relojFila("drop", "Agua", "hierve a las 13:48", "6:50"),
    luegoLinea("13:43", "Sofríe cebolla y ajo · 6 min", "Salsa") +
    luegoLinea("13:48", "Echa la pasta · 9 min", "Agua · a esta hora escurre justo cuando la salsa está"));
};

// D · Tarjeta «tu turno» con los carriles como fichas
P.d2d = function () {
  function ficha(icn, et, est, t, on) {
    return '<div class="caja" style="flex:1;padding:12px;' + (on ? "outline:2px solid var(--fg);outline-offset:-2px" : "") + '"><p class="cap" style="display:flex;gap:6px;align-items:center">' + ic(icn, "s") + et + "</p>" +
      '<div style="font-size:20px;font-weight:800;margin-top:6px">' + t + '</div><p class="ps">' + est + "</p></div>";
  }
  return tel(cabModo("Pasta con tomate y atún"),
    '<div class="caja" style="padding:24px 18px;margin-top:8px"><p class="cap ac">TU TURNO</p><div class="big" style="font-size:34px;margin-top:8px">Pica cebolla y ajo</div>' +
    '<p class="ps" style="margin-top:8px">½ cebolla y 1 diente de ajo, en trocitos</p><div style="display:flex;align-items:center;gap:12px;margin-top:20px"><div class="barra" style="flex:1"><i style="width:39%"></i></div><span class="reloj">1:50</span></div></div>' +
    '<div style="display:flex;gap:10px" class="g1">' + ficha("drop", "AGUA", "hasta que hierva", "6:50") + ficha("flame", "SALSA", "picas tú", "1:50", true) + "</div>" +
    '<p class="cap g">LUEGO</p><p class="p g0">13:43 · Sofríe cebolla y ajo, 6 min</p><p class="ps">13:48 · Echa la pasta (te aviso)</p>', hecho);
};

// ---- estados y casos de la recomendada (C) ----
P["d2c-antes"] = function () {
  return tel(cabModo("Pasta con tomate y atún", "1 ración"),
    '<p class="cap g1">ASÍ VA A IR · 20 MIN</p><div class="caja g0">' + gantt(PASTA, null) + "</div>" +
    '<p class="p g1">Empieza por el agua y pica mientras hierve. La pasta entra a las 13:48 para escurrirla justo cuando la salsa esté.</p>' +
    '<p class="ps g0">En una sola línea serían 37 min y la pasta se enfriaría esperando a la salsa.</p>' +
    '<p class="cap g">SACA</p><div class="caja g0">' + fila(ic("cooking-pot"), "Olla y sartén", "Dos fuegos") +
    fila(ic("knife"), "½ cebolla · 1 diente de ajo", "Se pican en el minuto 0:30") + fila(ic("package"), "100 g de pasta · 1 lata de atún · 200 g de tomate triturado", "") + "</div>",
    pie('<span class="btn ac">' + ic("cooking-pot") + "Empezar · a la mesa 14:00</span>"));
};
P["d2c-pasta"] = function () {
  return d2c("Echa la pasta", "100 g al agua que ya hierve · remueve una vez", null, 0,
    relojFila("flame", "Salsa", "sofrito, luego el tomate", "1:00"),
    luegoLinea("13:49", "Tomate a la sartén · 8 min", "Salsa") + luegoLinea("13:57", "Atún · y escurre la pasta", "Los dos acaban a la vez"),
    null, PASTA, 510, pie('<span class="btn" style="flex:0 0 96px">' + ic("caret-left") + '</span><span class="btn inv">' + ic("check") + "Pasta dentro · 9 min</span>"));
};
P["d2c-tarde"] = function () {
  var R = JSON.parse(JSON.stringify(PASTA));
  R.carriles[1].t[0].b = 330; R.carriles[1].t[1].a = 330; R.carriles[1].t[1].b = 690; R.carriles[1].t[2].a = 690; R.carriles[1].t[2].b = 1170;
  R.carriles[1].t[3].a = 1170; R.carriles[1].t[3].b = 1230; R.carriles[0].t[1].a = 630; R.carriles[0].t[1].b = 1170; R.carriles[0].t[2].a = 1185; R.carriles[0].t[2].b = 1245;
  R.union = 1245; R.total = 1305;
  return d2c("Sofríe cebolla y ajo", "A fuego medio, remueve de vez en cuando", "6:00", 0,
    relojFila("drop", "Agua", "ya hierve: la dejo a fuego bajo", "—"),
    luegoLinea("13:50", "Echa la pasta · 9 min", "Antes 13:48: picar te llevó 2 min más") + luegoLinea("13:51", "Tomate a la sartén · 8 min", "Salsa"),
    '<div class="caja g1 aviso" role="status">' + ic("arrows-clockwise") + '<p class="ps" style="color:var(--fg)">Rehecho el plan: a la mesa a las 14:02. La pasta sigue sin esperar.</p></div>',
    R, 330, pie('<span class="btn" style="flex:0 0 96px">' + ic("caret-left") + '</span><span class="btn inv">' + ic("check") + "Sofrito listo</span>"));
};
P["d2c-unalinea"] = function () {
  var R = { total: 600, carriles: [{ k: "s", et: "Sartén", ic: "flame", t: [{ a: 0, b: 60, m: 60 }, { a: 60, b: 420, m: 20 }, { a: 420, b: 540, m: 20 }, { a: 540, b: 600, m: 60 }] }], union: null };
  return tel(cabModo("Tortilla francesa con ensalada", "a la mesa 21:10", "1 carril"),
    '<div class="caja">' + gantt(R, 90) + "</div>" +
    '<p class="ps g1">Esta receta va en una sola línea: no hay nada que hacer en paralelo.</p>' +
    '<p class="cap ac g">AHORA · TUS MANOS</p><div class="big g0">Bate 2 huevos con sal</div>' +
    '<p class="cap g">LUEGO</p>' + luegoLinea("21:01", "Sartén con AOVE, fuego medio · 6 min") + luegoLinea("21:07", "Aliña la lechuga · 2 min"), hecho.replace("Picado", "Batidos"));
};
P["d2c-error"] = function () {
  return tel(cabModo("Pollo al curry con arroz", "a la mesa ~14:30"),
    '<div class="caja aviso g1" role="alert">' + ic("warning-circle") + '<div><p class="p">Al paso 3 le falta el tiempo</p>' +
    '<p class="ps">«Dora el pollo hasta que esté hecho» no dice cuántos minutos. Uso 8 min y los carriles se calculan con eso.</p>' +
    '<div style="display:flex;gap:8px;margin-top:10px"><span class="chip">6 min</span><span class="chip on">8 min</span><span class="chip">10 min</span><span class="chip">Otro</span></div></div></div>' +
    '<p class="ps g">El texto del evento no se toca: te lo apunto para decírselo a la Claude que planea.</p>',
    pie('<span class="btn inv">Seguir con 8 min</span>'));
};
var ALB = {
  total: 2580, union: 2400, carriles: [
    { et: "Bolas", ic: "fan", t: [{ a: 0, b: 480, m: 480 }, { a: 480, b: 1080, m: 30 }, { a: 1080, b: 1680, m: 30 }] },
    { et: "Salsa", ic: "flame", t: [{ a: 510, b: 690, m: 30 }, { a: 690, b: 1590, m: 30 }, { a: 1680, b: 2400, m: 30 }] },
    { et: "Pasta", ic: "drop", t: [{ a: 720, b: 1320, m: 30 }, { a: 1620, b: 2340, m: 15 }, { a: 2340, b: 2400, m: 60 }] },
    { et: "Micro", ic: "television-simple", t: [{ a: 2220, b: 2400, m: 15 }] }]
};
P["d2c-extremo"] = function () {
  return tel(cabModo("Albóndigas en salsa con rigatoni", "a la mesa 15:13", "4 carriles"),
    '<div class="caja">' + gantt(ALB, 2220) + "</div>" +
    '<p class="cap ac g">AHORA · TUS MANOS</p><div class="big g0">Arroz al micro · 3 min</div><p class="ps" style="margin-top:4px">Es para el tupper 2</p>' +
    '<p class="cap g">MIENTRAS · 3 A LA VEZ</p><div class="caja g0" style="padding:4px 14px">' +
    relojFila("drop", "Pasta", "rigatoni en la pota", "2:00") + relojFila("flame", "Salsa", "albóndigas en la salsa", "3:00") + relojFila("fan", "Ninja", "terminado · vacío", "—") + "</div>",
    pie('<span class="btn" style="flex:0 0 96px">' + ic("caret-left") + '</span><span class="btn inv">' + ic("check") + "Arroz dentro</span>"));
};
