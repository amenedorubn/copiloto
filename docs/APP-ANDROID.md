# Copiloto como app Android

La web (la de GitHub Pages) va **dentro** del APK con Capacitor 8: la app arranca y funciona sin internet desde el primer día.

## Cómo se actualiza sola

- Cada vez que `main` sube de versión, el Action **Publicar versión** crea la release y le sube `copiloto-web.zip` (la web de esa versión).
- La app, al abrirse, mira la última release (API de GitHub). Si hay una más nueva con zip, la baja en segundo plano y la pone **la siguiente vez que se abre** (o al tocar «Actualizar ahora» en Ajustes).
- Nunca con un entreno en marcha. Si una versión nueva no llega a arrancar (15 s sin `Nativo.listo()`), el actualizador vuelve solo a la anterior y esa versión no se vuelve a intentar.
- Lo nativo (voz, permisos, plugins) solo cambia con un APK nuevo, que se instala encima.

## Lo nativo (app/android)

- `CopilotoPlugin.java`: voz y pantalla encendida.
  - Voz neuronal **Miro** (Piper es-ES, con sherpa-onnx) dentro del APK: sin internet y sin depender del motor de voz del móvil. Si no cargara, la del sistema.
  - Pide el foco de audio *transitorio con atenuación* (uso «guía de navegación»): Spotify baja mientras habla y vuelve solo.
  - `FLAG_KEEP_SCREEN_ON` para `navigator.wakeLock`.
- `nativo.js` (raíz del repo): hace que `speechSynthesis` y `navigator.wakeLock` usen lo nativo. En el navegador no hace nada.

## Compilar el APK

Una vez por PC:

```
node app/descarga-voz.mjs      # la librería de voz y el modelo (≈130 MB, no van al repo)
cd app && npm install
```

Cada APK (JDK 21: el de Android Studio):

```
cd app && npm run sync
cd android && gradlew assembleRelease
```

Sale en `app/android/app/build/outputs/apk/release/app-release.apk`.

## La firma: guardar una copia

El APK se firma con `~/.copiloto/copiloto.jks` (contraseña en `~/.copiloto/firma.properties`, fuera del repo).
**Si se pierde, el siguiente APK no se puede instalar encima**: habría que desinstalar la app y se perderían sus datos. Guarda una copia de esa carpeta en el gestor de contraseñas o en la nube.

## Licencias

La voz Miro es CC BY-NC-SA 4.0 (uso no comercial). Ver `CREDITOS.md`.
