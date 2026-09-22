# Configuración única de `copiloto-api`

Esta es la parte que se hace **una sola vez**, con terminal. El código ya está
en `main`: falta conectar las credenciales.

## Resumen de los cuatro valores

| Dónde va | Nombre exacto | Qué es |
|---|---|---|
| GitHub → Settings → Secrets and variables → **Actions** | `CLOUDFLARE_API_TOKEN` | Token de Cloudflare, plantilla **"Edit Cloudflare Workers"** |
| GitHub → Settings → Secrets and variables → **Actions** | `CLOUDFLARE_ACCOUNT_ID` | Account ID de Cloudflare |
| Cloudflare → Workers → `copiloto-api` → **Variables and Secrets** | `ICAL_URL` | Dirección iCal secreta del calendario "Entreno" |
| Cloudflare → Workers → `copiloto-api` → **Variables and Secrets** | `APP_KEY` | Clave que se inventa aquí y se pasa al móvil |

Mayúsculas y guiones bajos tal cual: son los nombres que lee
`.github/workflows/worker.yml` y `worker/src/index.js`.

⚠️ **Los dos secretos del Worker no se ponen nunca en el repositorio ni en el
workflow.** El repo es público. Viven solo en Cloudflare y sobreviven a cada
despliegue.

---

## 1. Token y Account ID de Cloudflare

```
dash.cloudflare.com → icono de perfil → Profile → API Tokens
  → Create Token → plantilla "Edit Cloudflare Workers" → Use template
  → Continue to summary → Create Token → copiar (solo se enseña una vez)
```

El Account ID sale en **Workers & Pages**, en la columna de la derecha.

Los dos se pegan en GitHub como *repository secrets* con los nombres de la
tabla de arriba.

## 2. Primer despliegue

Se dispara solo con cualquier push que toque `worker/`, y también a mano:

```
GitHub → Actions → "Desplegar copiloto-api" → Run workflow
```

O desde terminal, en la carpeta `worker/`:

```bash
npx wrangler deploy
```

Comprobación, en el navegador o con curl:

```
https://copiloto-api.amenedorubn.workers.dev/salud
```

```json
{"ok":true,"worker":"copiloto-api","secretos":{"APP_KEY":false,"ICAL_URL":false}}
```

Los dos `false` son correctos en este punto.

## 3. Secretos del Worker

Desde el panel (**Settings → Variables and Secrets → + Add**, tipo **Secret**),
o desde terminal:

```bash
npx wrangler secret put ICAL_URL --name copiloto-api
npx wrangler secret put APP_KEY  --name copiloto-api
```

Para generar una `APP_KEY` decente:

```bash
openssl rand -base64 24
```

Vuelve a mirar `/salud`: los dos deben poner `true`.

> La iCal está en calendar.google.com → ⚙ junto al calendario "Entreno" →
> Configuración → abajo del todo → **Dirección secreta en formato iCal**.

## 4. Pasar la `APP_KEY` al móvil

La app la lee del fragmento de la URL, así que basta con generar un QR de:

```
https://amenedorubn.github.io/copiloto/v14/#key=LA_APP_KEY
```

o, para dejar también la dirección del Worker fijada:

```
https://amenedorubn.github.io/copiloto/v14/#key=LA_APP_KEY&url=https%3A%2F%2Fcopiloto-api.amenedorubn.workers.dev
```

Al abrirlo, la app guarda la clave en `localStorage` y **borra el fragmento de
la barra de direcciones** en el acto, sin dejar rastro en el historial. El
fragmento no viaja al servidor en ninguna petición, ni a GitHub Pages ni al
Worker, así que la clave no aparece en los registros de nadie.

Funciona tanto con la app cerrada como con la app ya abierta.

Alternativa sin QR: **Ajustes** dentro de la app, pegar la clave a mano y
pulsar *Probar y guardar*.

---

## Si algo falla

| Síntoma | Causa |
|---|---|
| Actions en rojo con `CLOUDFLARE_API_TOKEN` en el mensaje | Falta el secreto del paso 1 |
| `/salud` no responde | El Worker no se ha desplegado todavía |
| `/salud` dice `"APP_KEY":false` | Falta el secreto del paso 3 |
| La app dice *"clave incorrecta"* | La `APP_KEY` del móvil no es la de Cloudflare |
| La app dice *"el Worker avisa"* | Mirar la consola: suele ser `ICAL_URL` mal copiada |

El workflow avisa por sí solo: al terminar comprueba `/salud` y deja un
*warning* si el Worker está desplegado pero le faltan secretos.

---

# Fase 2 · Strava

Todo desde el navegador. **El refresh token no se toca a mano**: lo canjea y lo
guarda el propio Worker.

Si ya tienes una app en Strava, **no la borres**: vale igual. Solo hay que
cambiarle el dominio de retorno y volver a autorizarla con el permiso bueno.

## 1. Strava: el dominio de retorno

```
strava.com/settings/api  →  Editar
```

| Campo | Qué poner |
|---|---|
| Authorization Callback Domain | `copiloto-api.amenedorubn.workers.dev` |

Apunta también el **ID de cliente** y dale a **Mostrar** en *Secreto de cliente*.

## 2. El almacén KV: no hay que hacer nada

Lo crea y lo engancha el propio workflow en cada despliegue.

⚠️ **No lo añadas a mano en el panel.** `wrangler deploy` reemplaza los
bindings del Worker por los que declara el repositorio, así que un binding
puesto a mano desaparece en el siguiente despliegue. Por eso lo hace el
workflow: así sobrevive siempre.

## 3. Cloudflare: dos secretos

**Settings → Variables and Secrets → + Add**, tipo **Secret**:

| Nombre exacto | Valor |
|---|---|
| `STRAVA_CLIENT_ID` | el ID de cliente del paso 1 |
| `STRAVA_CLIENT_SECRET` | el secreto de cliente del paso 1 |

**No hay un tercer secreto.** El refresh token sale solo en el paso 4.

## 4. Conectar, desde el móvil

Abre esta dirección, **sin nada más detrás**:

```
https://copiloto-api.amenedorubn.workers.dev/strava/conectar
```

Sale una pantalla que pide la `APP_KEY`. Pégala y dale a Continuar. Así la
clave no se queda en el historial del móvil.

(Con `?k=TU_APP_KEY` detrás también funciona, incluso si la clave lleva `+`.)

Te lleva a Strava. **Acepta dejando marcada la casilla de ver todas tus
actividades** — si no, el Worker lo detecta y te dice que repitas. Al aceptar
vuelves solo y verás *"Strava conectado"*.

## 5. Comprobar

```
https://copiloto-api.amenedorubn.workers.dev/salud
```

```json
{"secretos":{"APP_KEY":true,"ICAL_URL":true,
             "STRAVA_APP":true,"KV":true,"STRAVA_CONECTADO":true}}
```

## Si algo falla

| Qué dice | Qué pasa |
|---|---|
| *Falta el almacén KV* | El workflow no pudo prepararlo. Mira el aviso en la pestaña Actions |
| *Faltan STRAVA_CLIENT_ID y...* | Paso 3 sin hacer |
| *Esa clave no coincide* | No es la `APP_KEY` que pusiste en Cloudflare. Los espacios al pegar y los `+` de las claves en base64 ya se tienen en cuenta |
| *Has dado permiso de read* | Repite el paso 4 marcando la casilla de todas las actividades |
| Strava dice que el dominio no vale | Paso 1: el callback domain tiene que ser el del Worker, sin `https://` |

El token se guarda en KV, así que Strava puede rotarlo y no hay que volver a
hacer nada.
