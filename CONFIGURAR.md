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

Tres secretos más, en el mismo sitio que los otros dos
(**Cloudflare → Workers → `copiloto-api` → Settings → Variables and Secrets**,
tipo **Secret**):

| Nombre exacto | Qué es |
|---|---|
| `STRAVA_CLIENT_ID` | Client ID de la app de Strava |
| `STRAVA_CLIENT_SECRET` | Client Secret de la app de Strava |
| `STRAVA_REFRESH_TOKEN` | Refresh token con permiso de lectura de actividades |

## 1. Crear la app en Strava

```
strava.com/settings/api
```

| Campo | Qué poner |
|---|---|
| Application Name | Copiloto |
| Category | Training |
| Club | (vacío) |
| Website | https://amenedorubn.github.io/copiloto/ |
| Authorization Callback Domain | **localhost** |

Al crear la app salen el **Client ID** y el **Client Secret**. El callback en
`localhost` es a propósito: la autorización se hace una sola vez y nadie tiene
que levantar un servidor.

## 2. Autorizar una vez y sacar el refresh token

Abre esta dirección en el navegador, con tu Client ID puesto:

```
https://www.strava.com/oauth/authorize?client_id=TU_CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=activity:read_all
```

Acepta. El navegador te manda a una página que no carga (normal, no hay nada en
localhost), pero **en la barra de direcciones está el código**:

```
http://localhost/?state=&code=ESTO_DE_AQUI&scope=read,activity:read_all
```

Cambia ese código por el refresh token:

```bash
curl -X POST https://www.strava.com/oauth/token \
  -d client_id=TU_CLIENT_ID \
  -d client_secret=TU_CLIENT_SECRET \
  -d code=EL_CODIGO_DE_LA_BARRA \
  -d grant_type=authorization_code
```

En la respuesta está `refresh_token`. Ese es el valor de `STRAVA_REFRESH_TOKEN`.

⚠️ El código de la barra **caduca en unos minutos y solo sirve una vez**. Si
falla, repite el paso de autorizar.

⚠️ El scope tiene que ser `activity:read_all`. Con `read` a secas la API no
devuelve las actividades.

## 3. Comprobar

```
https://copiloto-api.amenedorubn.workers.dev/salud
```

Debe poner `"STRAVA": true`.

## Nota sobre el refresh token

Strava puede rotarlo. El Worker lo guarda en KV si existe un namespace llamado
`COPILOTO`; sin KV funciona igual, pero si algún día Strava lo rota habrá que
repetir el paso 2. Para evitarlo, en Cloudflare: **Storage & Databases → KV →
Create namespace `copiloto`**, y luego en el Worker **Settings → Bindings → Add
→ KV namespace**, con nombre de variable `COPILOTO`.
