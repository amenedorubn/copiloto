# Nutrición · estadísticas (propuesta, sin programar)

Maquetas para elegir, con **datos ficticios**, a 390 × 844 y en oscuro y en claro. Las 7 pantallas tienen 4 opciones
cada una; en cada hoja va marcada la recomendada.

| Pantalla | Oscuro | Claro | Recomendada |
|---|---|---|---|
| N1 · Hoy | [N1](N1-oscuro.png) | [N1](N1-claro.png) | C · Energía grande + prioritarios |
| N2 · Semana | [N2](N2-oscuro.png) | [N2](N2-claro.png) | A · Barras apiladas por día |
| N3 · Tendencias | [N3](N3-oscuro.png) | [N3](N3-claro.png) | B · Una curva grande con selector |
| N4 · Fases | [N4](N4-oscuro.png) | [N4](N4-claro.png) | D · La fase de ahora + lo que viene |
| N5 · Carbohidratos según el entreno | [N5](N5-oscuro.png) | [N5](N5-claro.png) | A · Barras por tipo de día |
| N6 · Casa y compra | [N6](N6-oscuro.png) | [N6](N6-claro.png) | A · Huecos que se repiten |
| N7 · Micronutrientes | [N7](N7-oscuro.png) | [N7](N7-claro.png) | A · Mapa de calor |

Reglas de las maquetas:
- **Lenguaje del Arc:** curvas, tiras, anillos y barras en SVG a mano.
- **Color:** un solo acento, como mucho 2 usos por pantalla, tinta neutra y sin degradados.
- **Accesibles:** el valor también en texto, zonas de 44 px y «s/d» en lo que no tiene datos, nunca un 0 inventado.
- **Estados:** los de vacío, cargando y error se dibujan cuando se elija la opción.

El código está en `fuente/`: `nutri-maq.js`, que va con la plantilla de `../propuestas-cocina-v3/fuente/`, y `hojasN.mjs`.
