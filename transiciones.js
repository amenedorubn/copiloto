/* Transiciones entre pantallas (View Transitions API nativa).
   La decision va en una funcion pura para poder probarla sin navegador:
   solo se anima si hay soporte, no hay "movimiento reducido" y no hay una
   sesion en marcha (GPS, cinta). En cualquier otro caso se navega como antes. */
(function (raiz, fabrica) {
  var T = fabrica();
  if (typeof module === "object" && module.exports) module.exports = T;
  else raiz.Transiciones = T;
})(typeof window !== "undefined" ? window : this, function () {
  // entorno: { doc, reducido, corriendo, cintaEnCurso }
  function debeAnimar(e) {
    if (!e || !e.doc || typeof e.doc.startViewTransition !== "function") return false;
    if (e.reducido) return false;
    if (e.corriendo) return false;
    if (e.cintaEnCurso) return false;
    return true;
  }
  // ejecuta fn con o sin transicion; fn se ejecuta siempre, una sola vez.
  // e.antes() corre antes de la foto del estado viejo (solo si se anima);
  // e.alTerminar() cuando acaba (o se salta) la transicion.
  function conTransicion(fn, e) {
    if (!debeAnimar(e)) { fn(); return false; }
    var hecho = false, una = function () { if (!hecho) { hecho = true; fn(); } };
    try {
      if (typeof e.antes === "function") e.antes();
      var vt = e.doc.startViewTransition(una);
      if (typeof e.alTerminar === "function" && vt && vt.finished && typeof vt.finished.then === "function")
        vt.finished.then(e.alTerminar, e.alTerminar);
      else if (typeof e.alTerminar === "function") e.alTerminar();
      return true;
    } catch (err) { una(); if (typeof e.alTerminar === "function") e.alTerminar(); return false; }
  }
  return { debeAnimar: debeAnimar, conTransicion: conTransicion };
});
