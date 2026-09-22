# Esquema del bloque `#copiloto`

Así se escribe un entreno en la **descripción** de un evento del calendario
"Entreno" de Google. El Worker `copiloto-api` lo lee y la app lo convierte en
el copiloto del día.

## Reglas generales

- El bloque va entre dos líneas sueltas: `#copiloto` y `#fin`.
- Entre las dos, **JSON válido**, nada más.
- Todo lo que quede **fuera** del bloque se muestra como texto normal en la
  tarjeta del día. Puedes escribir notas encima o debajo sin romper nada.
- Un evento **sin** bloque `#copiloto` sale como título + descripción, sin
  copiloto. Eso está bien: un "Descanso" no necesita más.
- Si el JSON está mal, la app lo dice en la tarjeta con el error exacto y no
  se inventa nada.
- Las horas y los días salen del propio evento del calendario, no del JSON.

```
Notas para mí mismo, lo que sea.

#copiloto
{ "tipo": "cinta", ... }
#fin

Más notas.
```

## Campos comunes

| Campo | Obligatorio | Qué es |
|---|---|---|
| `tipo` | sí | `"cinta"`, `"fuera"` o `"gym"` |
| `nombre` | no | Nombre que sale en grande. Si falta, se usa el título del evento |

---

## `tipo: "cinta"`

Reutiliza **tal cual** el formato de bloques que ya usa el modo cinta.

| Campo | Obligatorio | Qué es |
|---|---|---|
| `inclinacion` | no | Número. Solo informativo, se enseña en pantalla |
| `bloques` | sí | Lista, en orden, de lo que hay que hacer |

Cada bloque:

| Campo | Obligatorio | Qué es |
|---|---|---|
| `tipo` | sí | `calentar`, `serie`, `trote` o `enfriar` (decide el color de pantalla) |
| `nombre` | no | Lo que canta la voz y sale en "SIGUIENTE" |
| `kmh` | sí | Velocidad objetivo en km/h |
| `seg` | sí | Duración en segundos |

La distancia **no se escribe**: sale de `kmh × seg`. El Worker devuelve además
un `total` con los segundos y los km de toda la sesión, ya calculados.

```json
#copiloto
{
  "tipo": "cinta",
  "nombre": "6×800 @ 4'50\"",
  "inclinacion": 1,
  "bloques": [
    {"tipo":"calentar","nombre":"Calentamiento","kmh":9.0,"seg":600},
    {"tipo":"serie","nombre":"Serie 1","kmh":12.4,"seg":232},
    {"tipo":"trote","nombre":"Trote 1","kmh":8.0,"seg":150},
    {"tipo":"serie","nombre":"Serie 2","kmh":12.4,"seg":232},
    {"tipo":"enfriar","nombre":"Enfriar","kmh":9.0,"seg":480}
  ]
}
#fin
```

---

## `tipo: "fuera"`

| Campo | Obligatorio | Qué es |
|---|---|---|
| `subtipo` | sí | `tempo`, `facil` o `largo` |
| `distancia` | sí | Objetivo en **metros** (20000 = 20 km) |
| `km` | no | Tramos por kilómetro |

Cada tramo:

| Campo | Obligatorio | Qué es |
|---|---|---|
| `desde` / `hasta` | sí | Kilómetro inicial y final. `hasta` va detrás de `desde` |
| `ritmo` | sí | Ritmo objetivo. `330` (segundos por km) o `"5'30\""`. Sale siempre en segundos |
| `banda` | no | `[rápido, lento]`, mismo formato que `ritmo` |
| `fc` | no | `[mínima, máxima]` pulsaciones |
| `nota` | no | Texto corto para ese tramo |

```json
#copiloto
{
  "tipo": "fuera",
  "subtipo": "largo",
  "nombre": "Test 20 km",
  "distancia": 20000,
  "km": [
    {"desde":0,"hasta":3,"ritmo":340,"banda":[335,350],"fc":[135,145],"nota":"suelta"},
    {"desde":3,"hasta":18,"ritmo":315,"banda":[310,322],"fc":[150,162]},
    {"desde":18,"hasta":20,"ritmo":330,"nota":"lo que quede"}
  ]
}
#fin
```

> El copiloto de calle (rutas de Strava, ajuste de distancia, enganche a la
> polilínea) llega en la **fase 2**. De momento la app enseña el plan para
> leerlo, y el modo GPS sigue funcionando aparte con su ruta.

---

## `tipo: "gym"`

| Campo | Obligatorio | Qué es |
|---|---|---|
| `rutina` | sí | `push`, `pull` o `pierna` |
| `ejercicios` | sí | Lista, en orden |

Cada ejercicio:

| Campo | Obligatorio | Qué es |
|---|---|---|
| `nombre` | sí | Nombre de la máquina o el ejercicio |
| `series` | sí | Número de series |
| `reps` | no | Número (`10`) o texto (`"8-10"`, `"al fallo"`) |
| `peso` | no | Kilos objetivo. Si falta, se usará el de la última vez |
| `descanso` | no | Segundos de descanso. Por defecto **90** |
| `nota` | no | Texto corto |

```json
#copiloto
{
  "tipo": "gym",
  "rutina": "push",
  "nombre": "Push A",
  "ejercicios": [
    {"nombre":"Press banca máquina","series":4,"reps":10,"peso":45,"descanso":90},
    {"nombre":"Press militar máquina","series":3,"reps":"8-10","peso":30},
    {"nombre":"Aperturas máquina","series":3,"reps":12,"peso":35,"descanso":60},
    {"nombre":"Tríceps polea","series":3,"reps":12,"peso":25,"descanso":60,"nota":"codos pegados"}
  ]
}
#fin
```

> El copiloto de gimnasio (series, descansos, historial) llega en la **fase 3**.

---

## Lo que devuelve el Worker

`GET /agenda?desde=2026-09-22&hasta=2026-10-20` con la cabecera
`X-Copiloto-Key`:

```json
{
  "generado": "2026-09-22T15:00:00.000Z",
  "zona": "Europe/Madrid",
  "desde": "2026-09-22",
  "hasta": "2026-10-20",
  "eventos": [
    {
      "uid": "abc123@google.com@1758610800000",
      "fecha": "2026-09-23",
      "hora": "07:00",
      "inicio": "2026-09-23T05:00:00.000Z",
      "titulo": "6×800 @ 4'50\"",
      "texto": "Llevar toalla.",
      "lugar": "",
      "plan": { "tipo": "cinta", "total": { "seg": 3222, "km": 9.161 }, "…": "…" }
    }
  ]
}
```

- `plan` es `null` cuando el evento no lleva bloque.
- Si el bloque está mal escrito, aparece un campo `error` con el motivo y
  `plan` se queda en `null`.
- `hora` es `null` en los eventos de todo el día.

### Repeticiones

Los eventos que se repiten se expanden en el Worker. Está soportado
`FREQ=DAILY`, `WEEKLY` y `MONTHLY`, con `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY`,
las fechas borradas a mano (`EXDATE`) y los días editados sueltos
(`RECURRENCE-ID`). El cambio de hora de marzo y octubre está contemplado: un
entreno a las 7:00 sigue a las 7:00 al otro lado del cambio.

Cualquier otra regla de repetición que el Worker no entienda se queda en su
primera fecha, que es el comportamiento seguro: nunca inventa un entreno.
