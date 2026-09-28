// Revision del Arc dentro de la pagina: mide lo que se ve de verdad (estilos
// calculados) contra las reglas de docs/DISENO-ARC.md. La inyecta
// scripts/capturas-arc.mjs y la llama con __audita("hoy") o __audita("arc").
window.__audita = function (pantalla) {
  const raiz = pantalla === "arc" ? document.getElementById("appPant") : document.getElementById("appHoy");
  const arc = [...raiz.querySelectorAll(".arcV")].filter((x) => !x.parentElement.closest(".arcV"));
  const R = { acento: [], tamanos: new Set(), pesos: new Set(), mayus: [], contraste: [], minContraste: 99, tactil: [], cajas: 0,
              gradientes: 0, emojis: [], iconos: [], seccion: [] };
  if (!arc.length) return { vacio: true };
  const tmp = document.createElement("i"); arc[0].appendChild(tmp);
  tmp.style.color = "var(--arc)"; const ACC = getComputedStyle(tmp).color; tmp.remove();
  const rgb = (c) => { const m = c.match(/[\d.]+/g); return m ? m.slice(0, 4).map(Number) : null; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const opaco = (c) => c && (c.length < 4 || c[3] > 0);
  // el fondo real de un texto: el primer fondo opaco hacia arriba. En una
  // tarjeta degradada el Arc (diseno A) va en su mitad de abajo, asi que se
  // mide contra cada color del degradado desde el 55 %
  const fondo = (el) => { for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n);
      if (cs.backgroundImage.includes("gradient")) {
        const st = [...cs.backgroundImage.matchAll(/rgba?\(([^)]+)\)\s*([\d.]+)%/g)].filter((m) => +m[2] >= 55).map((m) => m[1].split(",").map(Number));
        return st.length ? { stops: st } : { grad: true }; }
      const c = rgb(cs.backgroundColor); if (c && (c.length < 4 || c[3] > 0.5)) return { c }; } return { c: [10, 11, 13] }; };
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
  // un "uso" del acento = un componente distinto que lo lleva
  const nombreDe = (el) => { for (let n = el; n; n = n.parentElement) { const c = [...n.classList].find((k) => /^arc[A-Z]/.test(k) || k === "ring" || k === "dot"); if (c) return c; } return el.tagName; };
  const usos = new Set();
  const todos = arc.flatMap((a) => [a, ...a.querySelectorAll("*")]).filter(visible);
  for (const el of todos) {
    const cs = getComputedStyle(el);
    const usaAcc = [cs.backgroundColor, cs.borderTopColor, cs.fill, cs.stroke].some((c) => c === ACC) ||
                   (cs.color === ACC && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    if (usaAcc && !(el.closest("svg") && el.tagName !== "svg" && !["circle", "path"].includes(el.tagName))) usos.add(nombreDe(el));
    if (cs.backgroundImage.includes("gradient") && !el.closest(".tj")) R.gradientes++;
    const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (texto) {
      R.tamanos.add(cs.fontSize); R.pesos.add(cs.fontWeight);
      if (/\p{Extended_Pictographic}/u.test(texto)) R.emojis.push(texto);
      if (cs.textTransform === "uppercase") { const ls = parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize); if (!(ls >= 0.059)) R.mayus.push(texto); }
      const f = fondo(el);
      if (!f.grad && !el.closest("button:disabled")) {
        const c = rgb(cs.color); const a = (c.length > 3 ? c[3] : 1) * (+cs.opacity || 1);
        for (const fc0 of (f.stops || [f.c])) {
          const fc = fc0.slice(0, 3), mix = c.slice(0, 3).map((v, i) => v * a + fc[i] * (1 - a));
          const r = ratio(mix, fc); R.minContraste = Math.min(R.minContraste, r);
          if (r < 4.5) R.contraste.push(texto.slice(0, 40) + " " + r.toFixed(2));
        }
      } else if (f.grad) R.contraste.push("sin medir (degradado): " + texto.slice(0, 30));
    }
    if (el.matches("button,[role=radio],input,select,textarea") && !el.disabled) {
      const r = el.getBoundingClientRect(); let w = r.width, h = r.height;
      if (el.matches(".arcB .arcCk")) { w += 10; h += 10; }          // zona ampliada con ::after (inset -5px)
      if (w < 43.5 || h < 43.5) R.tactil.push((el.getAttribute("aria-label") || el.textContent.trim()).slice(0, 30) + " " + Math.round(w) + "x" + Math.round(h));
    }
    // iconos: Phosphor (viewBox 256); anillos, puntos y la curva de fuerza son graficos de datos
    if (el.tagName === "svg" && !el.classList.contains("ring") && !el.classList.contains("dot") && !el.classList.contains("arcCurva") &&
        el.getAttribute("viewBox") !== "0 0 256 256" && el.getAttribute("viewBox") !== "0 0 22 22") R.iconos.push(el.getAttribute("viewBox"));
    // cajas: fondos opacos anidados dentro del Arc (sin contar controles)
    if (!el.matches("button,input,textarea,select,svg,svg *,span,i,b") && opaco(rgb(cs.backgroundColor))) {
      let n = 0;
      for (let p = el; p && p !== raiz; p = p.parentElement) {
        if (p.matches("button,input,textarea,select,span,i,b")) continue;
        if (opaco(rgb(getComputedStyle(p).backgroundColor)) && !p.matches("#appPant,#appHoy,.hCuerpo")) n++;
      }
      R.cajas = Math.max(R.cajas, n);
    }
  }
  if (pantalla === "arc") R.seccion = [...document.querySelectorAll("#arcP > section")].slice(1).map((s) => parseFloat(getComputedStyle(s).marginTop));
  R.acento = [...usos]; R.tamanos = [...R.tamanos]; R.pesos = [...R.pesos];
  R.minContraste = +R.minContraste.toFixed(2);
  return R;
};
// lo que incumple una pantalla (lista vacia = pasa)
window.__fallos = function (v) {
  if (!v || v.vacio) return [];
  const f = [];
  if (v.acento.length > 2) f.push("acento en " + v.acento.length + " sitios: " + v.acento.join(", "));
  if (v.tamanos.length > 3) f.push("tamaños: " + v.tamanos.join(", "));
  if (v.pesos.length > 3) f.push("pesos: " + v.pesos.join(", "));
  if (v.mayus.length) f.push("mayúsculas sin tracking: " + v.mayus.join(" | "));
  if (v.contraste.length) f.push("contraste: " + v.contraste.join(" | "));
  if (v.tactil.length) f.push("zona táctil < 44 px: " + v.tactil.join(" | "));
  if (v.cajas > 2) f.push("cajas anidadas: " + v.cajas);
  if (v.gradientes) f.push("gradientes: " + v.gradientes);
  if (v.emojis.length) f.push("emojis: " + v.emojis.join(" "));
  if (v.iconos.length) f.push("iconos que no son Phosphor: " + v.iconos.join(", "));
  if (v.seccion.some((x) => x < 32 || x > 48)) f.push("espacio entre grupos: " + v.seccion.join(", "));
  return f;
};
