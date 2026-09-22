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
