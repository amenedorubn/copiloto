// D3 · Comprar
var segC = seg(["Semana", "Comprar|9", "Casa"], 1);
function filaCompra(it, marcado) {
  var duda = it[3] === "duda";
  return fila('<span class="chk' + (marcado ? " on" : "") + '">' + (marcado ? ic("check", "s") : "") + "</span>",
    it[0], it[2], duda ? '<span class="chip">Me quedan</span>' : '<span class="n">' + it[1] + "</span>", marcado ? ' style="opacity:.5"' : "");
}
var cabC = '<p class="ps g1">9 cosas para 6 comidas, hasta el domingo 11</p>';

// A · Por pasillo del súper; tocar = al carro; «Terminar compra» al final (recomendada)
P.d3a = function () {
  return tel(cab("Cocina", "Plan, compra y casa") + segC, cabC +
    COMPRA.map(function (z, i) {
      return '<p class="cap ' + (i ? "g" : "g1") + '">' + z.z + '</p><div class="caja g0" style="padding:2px 14px">' +
        z.items.map(function (it, k) { return filaCompra(it, i === 0 && k === 0); }).join("") + "</div>";
    }).join("").replace(/class="g"/g, 'style="margin-top:24px"'),
    pie('<span class="btn" style="flex:0 0 60px">' + ic("plus") + '</span><span class="btn inv">' + ic("basket") + "Terminar compra · 1 en el carro</span>"));
};
// B · Fichas tipo Bring!: rejilla con icono, tocar = comprado
P.d3b = function () {
  var F = [["carrot", "Cebolla", "2"], ["pepper", "Pimiento rojo", "1"], ["leaf", "Lechuga", "1"], ["orange-slice", "Kiwis", "3"], ["fish", "Atún en lata", "2 latas"],
    ["egg", "Huevos", "¿quedan?"], ["cheese", "Yogur griego", "2"], ["bowl-food", "Crema de verduras", "1 brick"], ["bird", "Contramuslos", "400 g"]];
  var t = function (f, on) {
    return '<div style="background:' + (on ? "var(--fg);color:var(--bg)" : "var(--sf)") + ';border-radius:16px;height:104px;padding:12px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center">' +
      ic(f[0], "l") + '<b style="font-size:13px;line-height:1.25">' + f[1] + '</b><small style="font-size:12px;font-weight:700;opacity:.7">' + f[2] + "</small></div>";
  };
  return tel(cab("Cocina", "Plan, compra y casa") + segC, cabC +
    '<div class="g1" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' + F.map(function (f, i) { return t(f, i === 0); }).join("") + "</div>" +
    '<p class="cap g">RECIENTES · TOCA PARA AÑADIR</p><div class="g0" style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip">' + ic("plus", "s") + 'Café molido</span><span class="chip">' + ic("plus", "s") + 'Pan de molde</span><span class="chip">' + ic("plus", "s") + "Plátanos</span></div>");
};
// C · Por cuándo hace falta (urgencia), no por comida
P.d3c = function () {
  var g = [["PARA HOY Y MAÑANA", [COMPRA[3].items[0], COMPRA[0].items[2], COMPRA[2].items[0]]],
    ["PARA EL MIÉRCOLES", [COMPRA[1].items[0], COMPRA[0].items[1], COMPRA[0].items[0]]],
    ["PUEDE ESPERAR", [COMPRA[0].items[3], COMPRA[2].items[1], COMPRA[3].items[1]]]];
  return tel(cab("Cocina", "Plan, compra y casa") + segC, cabC +
    g.map(function (x, i) { return '<p class="cap" style="margin-top:' + (i ? 24 : 12) + 'px">' + x[0] + '</p><div class="caja g0" style="padding:2px 14px">' + x[1].map(function (it) { return filaCompra(it); }).join("") + "</div>"; }).join(""));
};
// D · Dos fases: primero las dudas en casa, luego la lista de la tienda
P.d3d = function () {
  return tel(cab("Cocina", "Plan, compra y casa") + segC,
    '<p class="cap g1">ANTES DE SALIR · 3 DUDAS</p><div class="caja g0" style="padding:16px 14px"><p class="cap">1 DE 3</p><div class="big" style="margin-top:6px">¿Te quedan huevos?</div>' +
    '<p class="ps" style="margin-top:4px">La tortilla del martes pide 2. Desde el recuento del 2/10 se han gastado 4.</p>' +
    '<div style="display:flex;gap:8px;margin-top:14px"><span class="btn min" style="flex:1">No</span><span class="btn min" style="flex:1">1–2</span><span class="btn min inv" style="flex:1">3 o más</span></div></div>' +
    '<p class="cap g">EN LA TIENDA · 8</p><div class="caja g0" style="padding:2px 14px">' + [COMPRA[0].items[0], COMPRA[0].items[1], COMPRA[0].items[2], COMPRA[1].items[0]].map(function (it) { return filaCompra(it); }).join("") +
    '<p class="ps" style="padding:10px 0">y 4 más</p></div>');
};

// ---- estados de A ----
P["d3a-vacio"] = function () {
  return tel(cab("Cocina", "Plan, compra y casa") + seg(["Semana", "Comprar", "Casa"], 1),
    '<div style="padding:110px 8px 0;text-align:center">' + ic("check-circle", "l") + '<p class="big" style="font-size:20px;margin-top:12px">No falta nada</p>' +
    '<p class="ps" style="margin-top:8px">Las 6 comidas hasta el domingo 11 tienen todo en casa. Si quieres algo más, apúntalo.</p>' +
    '<div class="btn inv" style="margin-top:24px">' + ic("plus") + "Apuntar algo</div></div>");
};
P["d3a-error"] = function () {
  return tel(cab("Cocina", "Plan, compra y casa") + segC,
    '<div class="caja g1 aviso" role="alert">' + ic("cloud-slash") + '<div><p class="p">Lista de la copia de las 09:12</p>' +
    '<p class="ps">Sin conexión: si Claude cambió el plan después, puede faltar algo. Lo que marques se guarda y se envía al volver.</p>' +
    '<div class="btn min inv" style="margin-top:10px;display:inline-flex">' + ic("arrows-clockwise", "s") + "Reintentar</div></div></div>" +
    '<p class="cap" style="margin-top:24px">FRUTA Y VERDURA</p><div class="caja g0" style="padding:2px 14px">' + COMPRA[0].items.map(function (it) { return filaCompra(it); }).join("") + "</div>");
};
P["d3a-extremo"] = function () {
  var L = [["Queso fresco batido 0 % sin lactosa de la marca de siempre, el de 500 g", "1 + 125 g", "Desayunos · Merienda · Cena del jueves"],
    ["Tomates", "7", "5 comidas"], ["Pan de molde integral", "¿te queda?", "Tostadas", "duda"], ["Espinacas frescas", "300 g", "Curry · Tortilla"],
    ["Pechuga de pavo en lonchas", "6 lonchas", "Cenas"], ["Plátanos", "6", "Desayunos"]];
  return tel(cab("Cocina", "Plan, compra y casa") + seg(["Semana", "Comprar|27", "Casa"], 1),
    '<p class="ps g1">27 cosas para 14 comidas, hasta el domingo 11</p><p class="cap g1">FRUTA Y VERDURA · 9</p><div class="caja g0" style="padding:2px 14px">' +
    L.map(function (it) { return filaCompra(it); }).join("") + "</div>",
    pie('<span class="btn" style="flex:0 0 60px">' + ic("plus") + '</span><span class="btn inv">' + ic("basket") + "Terminar compra · 12 en el carro</span>"));
};
P["d3a-terminar"] = function () {
  var r = function (n, q, z) {
    return '<div class="fila"><div class="t"><b>' + n + "</b><small>" + z + '</small></div><span class="chip" style="gap:10px">' + ic("minus", "s") + "<b>" + q + "</b>" + ic("plus", "s") + "</span></div>";
  };
  return tel(cab("Cocina", "Plan, compra y casa") + segC, cabC + '<div class="caja g1" style="padding:2px 14px">' + COMPRA[0].items.map(function (it) { return filaCompra(it, true); }).join('') + '</div><div class="velo"></div>' +
    '<div class="hoja"><div class="asa"></div><p class="cap">TERMINAR COMPRA · 4 COSAS</p><p class="ps g0">Lo que has comprado entra en Casa. Cambia la cantidad si compraste más.</p>' +
    '<div class="g1">' + r("Contramuslos de pollo", "500 g", "Nevera · pedía 400 g") + r("Cebolla", "1 malla · 1 kg", "Fruta y verdura · pedía 2") + r("Atún en lata", "6 latas", "Despensa salada · pack 6 × 56 g") + r("Kiwis", "3", "Fruta y verdura") + "</div>" +
    '<div class="btn inv" style="margin-top:16px">' + ic("house") + "Meter en casa</div></div>");
};
