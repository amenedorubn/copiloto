# Conector de Copiloto para Claude (claude.ai)

Con el conector, la Claude de tu chat lee y cambia las comidas **directamente en Copiloto**, sin pasar por el
calendario «Comidas». Vive en el Worker `copiloto-api` (plan gratis de Cloudflare: Workers + el KV `COPILOTO`).

**URL del conector:** `https://copiloto-api.amenedorubn.workers.dev/mcp`

## Ponerlo en marcha (una vez)

1. **OAuth App de GitHub** (es como entras, igual que en el MCP de Obsidian). En
   <https://github.com/settings/developers> → *OAuth Apps* → *New OAuth App*:
   - Application name: `Copiloto conector`
   - Homepage URL: `https://copiloto-api.amenedorubn.workers.dev`
   - Authorization callback URL: `https://copiloto-api.amenedorubn.workers.dev/callback`

   Guárdala y pulsa *Generate a new client secret*.
2. **Dos secretos en Cloudflare**: *Workers & Pages* → `copiloto-api` → *Settings* → *Variables and Secrets* →
   *Add*, tipo **Secret**:
   - `GITHUB_CLIENT_ID` = el *Client ID* de la OAuth App
   - `GITHUB_CLIENT_SECRET` = el *client secret* que acabas de generar

   Comprueba en <https://copiloto-api.amenedorubn.workers.dev/salud> que sale `"CONECTOR":true`.
3. **En claude.ai**: *Settings* → *Connectors* → *Add custom connector*. Nombre `Copiloto`, URL la de arriba →
   *Add* → *Connect*. Sale «¿Dejar que Claude use Copiloto?» → **Permitir** → entra con GitHub. Solo vale tu cuenta
   (`amenedorubn`); cualquier otra se rechaza.
4. **Abre Copiloto** una vez: al bajar la agenda, el Worker copia al KV las comidas del calendario «Comidas» desde
   hace 7 días (una sola vez; los eventos no se tocan). Desde ese momento el calendario ya no se lee para recetas.

## Las herramientas

| Herramienta | Qué hace |
|---|---|
| `menu(desde, hasta)` | Las comidas de esas fechas (por defecto, 7 días desde hoy): id, fecha, hora, franja, título, si ya está cocinada, su revisión y la receta v4. |
| `receta(id)` | Una comida entera, con lo que dijo la app al revisarla: errores del linter y del plan, y avisos. |
| `guardar_comida(fecha, hora, título, texto, id?)` | Crea una comida (sin `id`) o la cambia (con `id`). Comprueba lo básico: que sea v4, raciones, `POR RACIÓN` y que cada paso empiece por un verbo y acabe en « · tiempo». Si falla, **no guarda** y devuelve los errores, uno por línea. |
| `borrar_comida(id)` | La borra de Copiloto. |
| `casa()` | Lo que hay en la despensa, la nevera y el congelador: la última foto que subió la app al sincronizar. |
| `formato()` | Las instrucciones del formato v4 (el bloque de [docs/RECETAS-CALENDARIO.md](docs/RECETAS-CALENDARIO.md)). |

**El linter completo y el plan los pasa la app**, no el Worker: el plan gratis da 10 ms de CPU por petición, y
leer y planificar una receta en frío tarda 40–85 ms. Al sincronizar (al abrir Copiloto o con ↻), la app revisa cada
comida nueva o cambiada (linter, y en el plan nada caliente esperando más de 60 s a lo siguiente) y sube el
resultado; `receta(id)` lo enseña. Si una comida cambia mientras la cocinas, el paso a paso pregunta «La receta ha
cambiado: ¿empezar la nueva?».

## Coste

Cero: Workers y KV del plan gratis. Cada herramienta lee 1–3 claves del KV; solo `guardar_comida`,
`borrar_comida` y la sincronización (si algo cambió) escriben, muy lejos del límite de 1000 escrituras al día.
