# Cocina v3 · propuesta (sin implementar)

Fase 1 y 2 del rediseño de Cocina. Nada de esto está en la app: son maquetas para decidir.
Todas las capturas usan **datos de ejemplo**, a 390 × 844, en oscuro y en claro.

## Hojas para decidir

| Decisión | Oscuro | Claro | Recomendada |
|---|---|---|---|
| D1 · Estructura y Recetas | [D1](D1-oscuro.png) | [D1](D1-claro.png) | A · Semana · Comprar · Casa |
| D2 · Paso a paso con carriles | [D2](D2-oscuro.png) | [D2](D2-claro.png) | C · Ahora + luego + mini-Gantt |
| D3 · Comprar | [D3](D3-oscuro.png) | [D3](D3-claro.png) | A · Por pasillo + terminar compra |
| D4 · Casa (Despensa) | [D4](D4-oscuro.png) | [D4](D4-claro.png) | C · «Por confirmar» + zonas |
| D5 · Nutrición y ficha de alimento | [D5](D5-oscuro.png) | [D5](D5-claro.png) | D · Lo que falta y con qué |
| D6 · Formato del calendario | [D6](D6-oscuro.png) | [D6](D6-claro.png) | A · Un apartado por carril |

## Diagnóstico

- **Sobra:** la subpestaña Recetas, que solo enseña las recetas que ya salen en Semana. También la cadena
  plan → compra → casa → cocinar → gasto, porque está repartida en pestañas que no se hablan: la comida es
  lo que importa, y la compra y la casa salen de ella.
- **Falta:** el paralelo. Hoy el paso a paso es una lista: «calienta agua y cuece la pasta» y, después, todo
  lo demás (37 min, con la pasta enfriándose). Con carriles salen 20 min y la pasta espera 15 s.
- **Falta** que la app enseñe lo que cree que has gastado o comprado, para confirmarlo con un toque.
  Ahora se resta sin que lo veas y aparecen «?» que nadie entiende.
- **Error del escáner:** guarda el nombre de Open Food Facts en lugar del tuyo
  (`cocina.js`, `items: [txt]` con `p.nombre`), y la nutrición se ve pero no se guarda.

## Modelo de datos unificado (con el de `amenedorubn/cocina`)

```
Receta   { titulo, raciones, carriles:[Carril], union:[Tarea], ingredientes:[Ing] }
Carril   { id:"agua", nombre, equipo:"fuego"|"micro"|"airfryer"|"horno"|null, tareas:[Tarea] }
Tarea    { id, txt, dur_s, manos_s, tras:[id], aguanta_s, avisos:[{a_los_s, txt}], usa:[Ing] }
Alimento { id, nombre /*el tuyo, nunca se pisa*/, alias:[], codigos:[{ean, formato}], zona,
           equivalencias:{ud_g}, nutricion:{por100:{kcal,hc,fibra,prot,grasa,vitC,folato},
           fuente:"tú"|"USDA"|"OFF"|"BEDCA", ref, fecha} }
```

- `manos_s` es lo que ocupa tus manos (picar: todo; echar la pasta: 15 s). Lo demás es espera.
- `aguanta_s` es cuánto puede esperar el resultado: la pasta, 30 s; el agua hirviendo y la salsa a fuego
  mínimo, sin límite.
- El `plan_gantt` y el `mientras_tanto` del repo `cocina` ya no se escriben a mano: los calcula el
  planificador. Los `carriles` del JSON de `cocina` pasan a ser `Carril.equipo`.
- **Planificador** (prototipo en `fuente/planifica.mjs`):
  1. Hacia delante, lo antes posible. Las manos hacen una cosa a la vez y hay 2 fuegos, 1 micro y 1 airfryer.
  2. Hacia atrás, lo que no aguanta se retrasa para acabar justo en la unión.
  3. Si vas tarde, se rehace desde ese momento.
  
  Caso pasta: **19:45**. Caso albóndigas: **43 min**, como la receta escrita a mano.
  Pendiente para la fase 3: una olla que espera hirviendo sigue ocupando un fuego.

## Formato en el calendario (D6)

- **A, recomendada:** apartados `CARRIL AGUA` / `CARRIL SALSA` / `AL JUNTAR`, con pasos numerados y sus
  minutos, más `(no espera)` y `(manos)` cuando haga falta.
- **B:** `[Agua]` delante de cada paso.
- **C:** un `PLAN` con horas, que calcula Claude.
- **D:** la app deduce los carriles sola.

Los eventos de ahora (solo `PROCESO`) siguen funcionando: se leen con la deducción de D y, si no sale nada
claro, en una sola línea.

## Patrones que se toman de cada app

| App | Patrón | Dónde |
|---|---|---|
| Grocy | «Consumir receta» resta el stock solo; conversión paquete ↔ gramos por producto | D4 «Por confirmar», ficha con equivalencias |
| Mealie / Tandoor | La lista sale del plan y salta lo que tienes; Tandoor la agrupa por sección del súper | D3 por pasillo |
| Bring! | Añadir con un toque desde «recientes»; la cantidad, debajo del nombre | D3 recientes, D4 meter escribiendo |
| Cookidoo | Un paso cada vez, con el tiempo como dato grande, y el aparato que avisa | D2 «Ahora» |
| Paprika / Crouton | Los tiempos del texto se convierten en relojes; cada paso enseña sus ingredientes | Relojes por carril |
| Cronometer / Yazio | Objetivos por nutriente en %; fuente de cada dato; alimento propio editable | D5 ficha («lo tuyo manda») |

**Nutrición:**
- **USDA FoodData Central** (CC0): los genéricos van dentro de la app, sin clave ni conexión.
- **Open Food Facts:** para los códigos de barras.
- **BEDCA:** solo uso no comercial y sin permiso para redistribuirla, así que no puede ir en un repo público.

Objetivos EFSA para adultos: fibra 25 g, vitamina C 110 mg, folato 330 µg DFE y carbohidratos del 45 al 60 %
de la energía.

## Reglas de diseño que cumplen las maquetas

- **Color:** un acento (`--coc` de la app), como mucho 2 usos por pantalla, sin degradados.
- **Tipografía:** Manrope con 3 pesos; mayúsculas con 0,08em; cuerpo con interlineado 1,5.
- **Iconos:** solo Phosphor.
- **Contenedores y tamaños:** 2 niveles de contenedor como mucho, sin borde de color a la izquierda, botones de 44 px o más.
- **Carriles:** se distinguen por icono y nombre, no por color. Las manos van en tinta llena y la espera en tinta suave.

Las maquetas se repiten con `node fuente/render.mjs` y `node fuente/hojas.mjs`. Hace falta `playwright-core` y el
Chrome instalado. Va mudo.
