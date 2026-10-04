// D6 · cómo escribe la Claude del calendario una receta con carriles
var ING = "Pasta con tomate y atún\n1 RACIÓN · 20 min\n\nINGREDIENTES\n· 100 g de pasta\n· 1 lata de atún\n· 200 g de tomate triturado\n· ½ cebolla · 1 diente de ajo\n· Básicos: sal, AOVE\n";
function d6(sub, texto, nota) {
  return tel(cab("Evento de «Comidas»", sub),
    '<div class="caja g0" style="padding:12px 14px"><div class="mono">' + texto.replace(/</g, "&lt;") + "</div></div>" +
    '<p class="cap g1">COPILOTO LO ENTIENDE ASÍ</p><div class="caja g0">' + gantt(PASTA, null, { ley: false }) + "</div>" +
    '<p class="ps g0">' + nota + "</p>");
}
P.d6a = function () {
  return d6("A · Un apartado por carril", ING + "\nCARRIL AGUA\n1. Olla con agua y sal al fuego, 8 min hasta que hierva\n2. Pasta, 9 min (no espera)\n3. Escúrrela\n\nCARRIL SALSA\n1. Pica cebolla y ajo, 3 min (manos)\n2. Sofríe con AOVE, 6 min\n3. Tomate, 8 min\n4. Atún, 1 min\n\nAL JUNTAR\n1. Mezcla la pasta con la salsa y sirve",
    "Claude solo dice qué va con qué. Las horas las calcula la app.");
};
P.d6b = function () {
  return d6("B · Etiqueta en cada paso", ING + "\nPROCESO\n1. [Agua] Olla con agua y sal al fuego, 8 min hasta que hierva\n2. [Salsa] Pica cebolla y ajo, 3 min\n3. [Salsa] Sofríe con AOVE, 6 min\n4. [Agua] Pasta, 9 min (no espera)\n5. [Salsa] Tomate, 8 min\n6. [Salsa] Atún, 1 min\n7. [Agua] Escúrrela\n8. [Juntar] Mezcla y sirve",
    "Se lee en orden, como ahora. Si Claude ordena mal, la app lo reordena.");
};
P.d6c = function () {
  return d6("C · Plan con horas", ING + "\nPLAN · 20 min\n0:00  agua   olla con agua y sal al fuego\n0:30  salsa  pica cebolla y ajo\n3:30  salsa  sofríe, 6 min\n8:30  agua   pasta, 9 min\n9:30  salsa  tomate, 8 min\n17:30 salsa  atún, 1 min\n17:45 agua   escurre\n18:45 juntos mezcla y sirve",
    "Las horas las calcula Claude. Si se equivoca en una cuenta, la pasta espera.");
};
P.d6d = function () {
  return d6("D · Sin cambios: la app deduce", ING + "\nPROCESO\n1. Calienta agua con sal en una olla y cuece la pasta 9 min\n2. Pica la cebolla y el ajo\n3. Sofríelos en la sartén 6 min\n4. Añade el tomate, 8 min, y el atún 1 min\n5. Escurre la pasta y mézclala con la salsa",
    "«olla» y «agua» van a Agua, «sartén» a Salsa. Hay que partir el paso 1 y adivinar los 8 min de hervir: aquí falla.");
};
