// D4 · Casa (Despensa): meter, sacar y cantidades
var segD = seg(["Semana", "Comprar|9", "Casa"], 2);
var barraMeter = pie('<span class="btn">' + ic("microphone") + '</span><span class="btn">' + ic("barcode") + '</span><span class="btn">' + ic("receipt") + '</span><span class="btn inv" style="flex:2">' + ic("plus") + "Meter</span>");
function zonaCaja(z, swipe) {
  return '<p class="cap" style="margin-top:24px;display:flex;justify-content:space-between"><span>' + z.z + "</span>" + (z.n ? "<span>" + z.n + "</span>" : "") + "</p>" +
    '<div class="caja g0" style="padding:2px 14px;overflow:hidden">' + z.items.map(function (it, i) {
      var r = fila("", it[0], "", '<span class="n">' + it[1] + "</span>");
      if (swipe && i === 1) r = '<div style="position:relative;margin:0 -14px"><div style="position:absolute;inset:0;background:var(--sf2);display:flex;justify-content:flex-end;align-items:center;padding-right:16px;font-size:14px;font-weight:800;gap:6px">' + ic("trash", "s") + 'Se acabó</div><div style="position:relative;background:var(--sf);transform:translateX(-112px);padding:0 14px">' + r + "</div></div>";
      return r;
    }).join("") + "</div>";
}

// A · Zonas con gesto: deslizar = se acabó, tocar = cantidad; barra fija para meter
P.d4a = function () {
  return tel(cab("Cocina", "Plan, compra y casa") + segD,
    '<p class="ps g1">34 cosas · a la izquierda, se acabó; toca para la cantidad</p>' + ZONAS.map(function (z, i) { return zonaCaja(z, i === 1); }).join(""), barraMeter);
};
// B · Fichas por zona con su cantidad
P.d4b = function () {
  var t = function (n, q, i) { return '<div style="background:var(--sf);border-radius:16px;padding:12px;min-height:84px;display:flex;flex-direction:column;justify-content:space-between">' + ic(i) + '<div><b style="display:block;font-size:13px;line-height:1.3">' + n + '</b><small style="font-size:12px;font-weight:700;color:var(--mu)">' + q + "</small></div></div>"; };
  var grid = function (a) { return '<div class="g0" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' + a.join("") + "</div>"; };
  return tel(cab("Cocina", "Plan, compra y casa") + segD,
    '<p class="cap g1" style="display:flex;justify-content:space-between"><span>CONGELADOR</span><span>2 DE 3 TUPPERS</span></p>' + grid([t("Tupper albóndigas", "2", "snowflake"), t("Arroz micro", "3 bolsas", "grains"), t("Cebolla troceada", "½ bolsa", "carrot")]) +
    '<p class="cap" style="margin-top:24px">NEVERA</p>' + grid([t("Leche semi", "1 l abierta", "drop"), t("Yogur natural", "2", "cheese"), t("Huevos", "?", "egg"), t("Tomates", "2", "carrot")]) +
    '<p class="cap" style="margin-top:24px">DESPENSA SALADA</p>' + grid([t("Macarrones", "600 g", "grains"), t("Atún en lata", "1 lata", "fish"), t("Tomate triturado", "400 g", "jar")]), barraMeter);
};
// C · «Por confirmar» arriba: lo que la app cree que entró o salió, a un toque; debajo las zonas (recomendada)
function porConfirmar() {
  return '<p class="cap g1">POR CONFIRMAR · 2</p><div class="caja g0" style="padding:14px">' +
    '<p class="p">La pasta de hoy gastó</p><p class="ps">100 g de macarrones · 1 lata de atún · 200 g de tomate triturado · ½ cebolla</p>' +
    '<div style="display:flex;gap:8px;margin-top:10px"><span class="btn min inv" style="flex:1">' + ic("check", "s") + 'Así fue</span><span class="btn min" style="flex:1">' + ic("pencil-simple", "s") + "Corregir</span></div>" +
    '<div style="border-top:1px solid var(--ln);margin-top:14px;padding-top:12px"><p class="p">Queda ½ cebolla troceada</p><p class="ps">¿A la nevera, en un táper?</p>' +
    '<div style="display:flex;gap:8px;margin-top:10px"><span class="btn min" style="flex:1">Nevera</span><span class="btn min" style="flex:1">Se tiró</span></div></div></div>';
}
P.d4c = function () {
  return tel(cab("Cocina", "Plan, compra y casa") + segD, porConfirmar() + zonaCaja(ZONAS[0]) + zonaCaja(ZONAS[1], true), barraMeter);
};
// D · Por uso: lo que piden las comidas, lo que se acaba y lo demás
P.d4d = function () {
  var c = function (t, rows) { return '<p class="cap" style="margin-top:24px">' + t + '</p><div class="caja g0" style="padding:2px 14px">' + rows.map(function (r) { return fila("", r[0], r[2], '<span class="n">' + r[1] + "</span>"); }).join("") + "</div>"; };
  return tel(cab("Cocina", "Plan, compra y casa") + segD,
    c("LO PIDEN LAS COMIDAS", [["Macarrones", "600 g", "Pasta hoy · pide 100 g"], ["Atún en lata", "1 lata", "Pasta hoy · pide 1"], ["Huevos", "?", "Tortilla mar · pide 2"]]) +
    c("SE ACABA", [["Leche semi", "~200 ml", "Desayunos: 2 días"], ["Cebolla troceada", "½ bolsa", "Curry mié"]]) +
    c("LO DEMÁS · 29", [["Arroz de microondas", "3 bolsas", "Congelador"], ["Yogur natural", "2", "Nevera"]]), barraMeter);
};

// ---- estados y hojas de C ----
P["d4c-vacio"] = function () {
  return tel(cab("Cocina", "Plan, compra y casa") + seg(["Semana", "Comprar", "Casa"], 2),
    '<div style="padding:100px 8px 0;text-align:center">' + ic("house", "l") + '<p class="big" style="font-size:20px;margin-top:12px">Aún no sé qué hay en casa</p>' +
    '<p class="ps" style="margin-top:8px">Dicta lo que ves, zona a zona: «Nevera: leche, 6 huevos». Con eso, Comprar deja de pedirte lo que ya tienes.</p>' +
    '<div class="btn inv" style="margin-top:24px">' + ic("microphone") + 'Dictar el recuento</div><div class="btn" style="margin-top:8px">' + ic("barcode") + "Escanear lo que tengo</div></div>");
};
P["d4c-error"] = function () {
  return tel(cab("Cocina", "Plan, compra y casa") + segD,
    '<div class="caja g1 aviso" role="alert">' + ic("warning-circle") + '<div><p class="p">No puedo leer tu nota «Despensa habitual»</p>' +
    '<p class="ps">El Worker no tiene permiso (VAULT_TOKEN caducado). Sigo con tu último recuento, del 2/10, y lo apuntado después.</p>' +
    '<div class="btn min inv" style="margin-top:10px;display:inline-flex">' + ic("arrows-clockwise", "s") + "Reintentar</div></div></div>" + zonaCaja(ZONAS[1]) + zonaCaja(ZONAS[2]), barraMeter);
};
P["d4c-extremo"] = function () {
  var z = { z: "Congelador", n: "3 de 3 tuppers", items: [["Tupper · Albóndigas con rigatoni", "2"], ["Tupper · Lentejas con chorizo y verduras de la huerta del domingo", "1"], ["Arroz de microondas", "3 bolsas"], ["Guisantes", "¾ bolsa"]] };
  return tel(cab("Cocina", "Plan, compra y casa") + segD,
    '<div class="caja g1 aviso" role="alert">' + ic("snowflake") + '<div><p class="p">El congelador está lleno de tuppers</p>' +
    '<p class="ps">3 de 3. El curry del miércoles es de ración doble y su tupper no cabe. Come uno antes: el martes toca albóndigas.</p></div></div>' + zonaCaja(z), barraMeter);
};
P["d4c-meter"] = function () {
  var op = function (i, t, s) { return fila('<span style="width:44px;height:44px;border-radius:14px;background:var(--sf2);display:flex;align-items:center;justify-content:center">' + ic(i) + "</span>", t, s, '<span class="mu">' + ic("caret-right", "s") + "</span>"); };
  return tel(cab("Cocina", "Plan, compra y casa") + segD, porConfirmar() + zonaCaja(ZONAS[0]) + '<div class="velo"></div><div class="hoja"><div class="asa"></div><p class="cap">METER EN CASA</p>' +
    '<div class="caja g1" style="background:var(--sf2);display:flex;align-items:center;gap:10px;height:52px">' + ic("keyboard", "mu") + '<span class="p">atún 6</span><span class="ps" style="margin-left:auto">Despensa salada</span></div>' +
    '<div class="g0" style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip on">Atún en lata · 6 latas</span><span class="chip">Atún fresco</span></div>' +
    '<div class="g1">' + op("microphone", "Dictar", "«Dos latas de atún y un kilo de pasta»") + op("barcode", "Escanear", "Uno detrás de otro; sale con tu nombre") +
    op("receipt", "Foto del ticket", "Lee las líneas y te pregunta solo lo que no conoce") + "</div></div>");
};
P["d4c-cantidad"] = function () {
  return tel(cab("Cocina", "Plan, compra y casa") + segD, porConfirmar() + zonaCaja(ZONAS[0]) + '<div class="velo"></div><div class="hoja"><div class="asa"></div><p class="cap">DESPENSA SALADA</p>' +
    '<div class="big g0">Macarrones</div><p class="ps">Paquete de 1 kg · abierto</p>' +
    '<p class="cap g1">¿CUÁNTO QUEDA?</p><div class="g0" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">' +
    ["Lleno", "¾", "½", "¼", "Nada"].map(function (x, i) { return '<span class="btn min' + (i === 2 ? " inv" : "") + '" style="padding:0">' + x + "</span>"; }).join("") + "</div>" +
    '<p class="ps g0">½ ≈ 500 g · o escribe los gramos</p>' +
    '<p class="cap g1">PAQUETES CERRADOS</p><div class="g0" style="display:flex;align-items:center;gap:16px"><span class="btn min">' + ic("minus") + '</span><span class="big">1</span><span class="btn min">' + ic("plus") + "</span></div>" +
    '<div style="display:flex;gap:8px;margin-top:20px"><span class="btn" style="flex:1">' + ic("swap") + 'Mover de zona</span><span class="btn inv" style="flex:1">Guardar</span></div></div>');
};
P["d4c-escaner"] = function () {
  return tel(cab("Escanear", "Uno detrás de otro"),
    '<div style="height:200px;border-radius:18px;background:var(--sf2);display:flex;align-items:center;justify-content:center" class="g0">' + ic("camera", "l") + "</div>" +
    '<div class="caja g1"><p class="cap">CÓDIGO NUEVO · 8410000000000</p><div class="p" style="margin-top:6px">El paquete dice «Mejillón en escabeche 3×80 g»</div>' +
    '<p class="cap g1">¿CÓMO LO LLAMAS TÚ?</p><div class="g0" style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip on">Mejillones en lata</span><span class="chip">Mejillón en escabeche</span><span class="chip">' + ic("pencil-simple", "s") + "Otro</span></div>" +
    '<p class="ps g1">«Mejillones en lata» ya está en Casa: este código se queda con ese nombre y la próxima vez no pregunto.</p></div>' +
    '<div class="caja g1" style="padding:4px 14px">' + fila(ic("check", "mu"), "Atún en lata · 3 latas", "Código conocido · Despensa salada") + "</div>",
    pie('<span class="btn">Terminar</span><span class="btn inv">' + ic("check") + "Meter · 3 latas</span>"));
};
