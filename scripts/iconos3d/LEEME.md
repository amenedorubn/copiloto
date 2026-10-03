# Iconos de destino en 3D

Los iconos de viaje del Arc (Eiffel, Atomium, El Castillo de Chichén Itzá, Coliseo, casas de canal de Ámsterdam y bandera de México)
son renders 3D en grises con luz y sombra, hechos con [three.js](https://threejs.org/) y exportados a WebP de 192 px con fondo
transparente. Van dentro de `arc.js` (`PROPIOS`) como `data:` URI. La Torre de Hércules sigue siendo vectorial.

No forman parte de la app: solo hace falta esto para rehacerlos.

```bash
npm i --no-save three playwright-core            # en la raíz del repo; node_modules/ está en .gitignore
python3 -m http.server 8899 --bind 127.0.0.1 &   # desde la raíz del repo
# usa el Chromium de Playwright; si hace falta: CHROME=/ruta/al/chrome
node scripts/iconos3d/run.mjs eiffel.html /tmp/f_eiffel 192   # -> /tmp/f_eiffel.png y /tmp/f_eiffel.webp.b64
```

`run.mjs` abre la página del modelo, recorta el render al contenido y lo centra en un cuadrado. El contenido de `.webp.b64` es lo que
va en el `href="data:image/webp;base64,…"` del `<image>` de cada icono en `arc.js`.
