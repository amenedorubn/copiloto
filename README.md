# Copiloto · centro de entrenos

PWA de entrenamiento: calendario del día y copilotos de cinta, calle (GPS) y
gimnasio. Se sirve con GitHub Pages.

**La app se instala desde la raíz:** https://amenedorubn.github.io/copiloto/

> ⚠️ **v20/ se eliminará tras el 18 de octubre; se convertirá en redirección
> a la raíz.** Hasta entonces se queda intacta porque es la app instalada en
> el móvil. No se toca nada dentro de `v20/`.

## Estructura del repo

| Ruta | Qué es |
|---|---|
| `index.html` | La app entera (HTML, CSS y JS en un solo fichero). Lleva `APP_VERSION`. |
| `sw.js` | Service worker. La caché se llama `copiloto-X.Y.Z`. |
| `manifest.webmanifest` | Manifest de la PWA ("Copiloto", sin número). |
| `version.json` | Versión publicada: `{"version","fecha","notas"}`. La app lo consulta para saber si hay una nueva. |
| `icon*.png`, `icon.svg`, `apple-touch-icon.png` | Iconos. |
| `fonts/` | Tipografía Manrope. |
| `rutas/` | GPX de las rutas que trae la app. |
| `worker/` | Worker de Cloudflare `copiloto-api` (calendario, Strava, Hevy). Ver [CONFIGURAR.md](CONFIGURAR.md). |
| `ESQUEMA.md` | Cómo se escribe un entreno en el calendario. |
| `CHANGELOG.md` | Qué cambia en cada versión. |
| `scripts/bump.mjs` | Sube la versión en todos los sitios a la vez. |
| `scripts/check-version.mjs` | Comprueba que las tres versiones coinciden (lo usa el Action). |
| `scripts/releases.sh` | Crea una GitHub Release desde el CHANGELOG (lo usa el Action; a mano solo si hiciera falta). |
| `v20/` | Copia congelada de la 2.0.0 (ver aviso de arriba). |

Las versiones antiguas ya no están en carpetas: están en los tags de git.
Para ver, por ejemplo, la v13: `git checkout v1.3.0`.

## Esquema de versiones

Se usa [Versionado Semántico](https://semver.org/lang/es/) `MAYOR.MENOR.PARCHE`:

| Cambio | Sube | Ejemplo |
|---|---|---|
| Arreglo o ajuste pequeño | parche | 2.0.0 → 2.0.1 |
| Función nueva | menor | 2.0.1 → 2.1.0 |
| Rediseño grande o cambio incompatible | mayor | 2.1.0 → 3.0.0 |

Las carpetas antiguas se renumeraron dividiendo por 10: `v4` → 0.4.0 …
`v9` → 0.9.0, `v10` → 1.0.0 … `v19` → 1.9.0, `v20` → 2.0.0.

La versión vive en tres sitios que **siempre** deben coincidir:

1. `APP_VERSION` en `index.html`
2. `version` en `version.json`
3. el nombre de la caché en `sw.js` (`copiloto-X.Y.Z`)

Al cambiar la caché cambia `sw.js`, y así el navegador detecta que hay versión
nueva. El Action **Versión coherente** falla si las tres no coinciden.

## Cómo publicar una versión

```bash
# 1. subir la versión (patch, minor o major) con una nota corta
node scripts/bump.mjs patch "Arreglo del aviso de la recta"

# 2. commit y push a main
git add -A
git commit -m "v2.0.2: Arreglo del aviso de la recta"
git push origin main
```

Ya está. **El tag y la GitHub Release los crea solo** el Action *Publicar
versión* en cuanto llega a `main` un cambio de `version.json`: pone el tag
`vX.Y.Z` en ese commit y copia la entrada del CHANGELOG en la release. Si
alguna versión se quedó sin tag o sin release, también la crea. No hace falta
subir tags a mano.

`bump.mjs` no necesita dependencias: cambia `APP_VERSION` y `APP_FECHA` en
`index.html`, reescribe `version.json`, renombra la caché de `sw.js` y añade la
entrada al principio de `CHANGELOG.md`. Si quieres, completa a mano la entrada
del CHANGELOG antes del commit.

GitHub Pages publica en uno o dos minutos. En el móvil: **Ajustes → Comprobar
actualización → Actualizar ahora**.

## Cómo se actualiza la app en el móvil

- Al abrir la app se mira `version.json` en silencio. Si hay una versión
  nueva, sale un **puntito en el icono de Ajustes**; no se recarga nada.
- En **Ajustes** se ve la versión instalada y su fecha. *Comprobar
  actualización* compara (en semver) con la publicada y, si hay nueva,
  enseña sus notas y el botón *Actualizar ahora*.
- *Actualizar ahora* descarga el service worker nuevo, le dice que tome el
  mando y recarga la app una sola vez.
- Con un entreno de GPS o de cinta en marcha el botón está desactivado: nunca
  se actualiza a mitad de un entreno.
- Sin conexión sale un aviso y la app sigue funcionando igual.
