# Sistema de diseño — Prime Ledger

Lo que la app **ya es**, medido sobre `src/index.css` (300 líneas de tokens y
base) y `src/app.css` (1.192 líneas de componentes). Todo número de aquí sale de
contar el CSS, no de una intención. La sección final, *Deuda*, separa lo que es
sistema de lo que es acumulación.

Antes de cambiar cualquier cosa visual, lee esto: la estética no es un default
que un agente eligió, es una decisión con nombre.

## Identidad

**Orokin evolucionado.** La ficción visual de Warframe: oro sobre void. Dos
anclas y todo lo demás es jerarquía.

Los grises son **cálidos, no azulados** — está escrito en el CSS y es la razón:
el oro pelea con los fríos. El fondo lleva dos halos radiales fijos (oro al 7 %
arriba a la derecha, teal al 5 % abajo a la izquierda) que no se mueven con el
scroll (`background-attachment: fixed`).

## Color

Cada color dice **una sola cosa**. Esta es la regla que más importa: la paleta
es semántica, no decorativa. Un color nuevo sin significado nuevo es un error.

| Token | Hex | Significa | Contraste s/ `--void` |
|---|---|---|---|
| `--void` | `#0a0a0d` | el fondo de todo | — |
| `--surface` | `#101015` | tarjeta / panel | — |
| `--surface-2` | `#16161d` | elevación dentro de una tarjeta | — |
| `--inset` | `#0c0c10` | hundido (inputs, barras) | — |
| `--line` | `#262630` | borde visible | — |
| `--line-soft` | `#1c1c24` | separador interno | — |
| `--gold` | `#c9a961` | la marca, el XP y el rango | 8,79 ✓ |
| `--gold-bright` | `oklab(gold 62 % + #fffaf0)` | énfasis y anillo de foco | — |
| `--hair` | `oklab(gold 34 %)` | filete de oro | — |
| `--glow` | `oklab(gold 13 %)` | halo de oro | — |
| `--text` | `#ece8dd` | cuerpo | 16,15 ✓ |
| `--text-dim` | `#9c988e` | secundario | 6,87 ✓ |
| `--text-faint` | `#8b8780` | terciario | 5,53 ✓ |
| `--teal` | `#58c7c0` | **accionable ya** | 9,74 ✓ |
| `--blue` | `#8aa8e2` | **listo, sin usar** | 8,27 ✓ |
| `--red` | `#c8705f` | **vault · fuera de alcance** | 5,59 ✓ |
| `--mastery` | `#e6f3fa` | **estado terminal**: masterizado (blanco hielo del sigil del juego) | 17,48 ✓ |
| `--rare` / `--uncommon` / `--common` | `#e8cd85` / `#b9c4d4` / `#b08d57` | rareza de reliquia | — |

Contraste WCAG 2.1 calculado sobre `--void`; ✓ = pasa AA (≥ 4,5:1) para texto
normal. Sobre `--surface-2`, el fondo más claro, todos bajan ~9 % y siguen
pasando: el peor es `--text-faint` a 5,04. Antes era `#6a675f` (3,19 en el peor
caso) y era el único token que fallaba.

**El reparto oro/blanco hielo es deliberado:** el oro es para el XP y el rango
(la cantidad), el blanco hielo para el estado terminal (masterizado). No los
intercambies.

Los tres `--*-glow` (teal, azul, rojo al 11–14 % de alfa) y `--mastery-glow`
existen para teñir fondos de estado, no para brillar.

## Tipografía

| Familia | Token | Rol |
|---|---|---|
| Space Grotesk | `--d` | display, **cifras** y etiquetas |
| IBM Plex Sans | `--b` | cuerpo |

Base: 14 px / 1,5. Pesos en uso: **600** (32 veces), **700** (9), **500** (6) —
o sea, la app es de peso semibold, y el 700 es el énfasis real.

La clase `.n` marca cifras: van en Space Grotesk porque sus numerales son más
legibles en tamaños chicos. Úsala para todo número que se lea como dato.

Escala: seis tokens y nada por debajo de 12 px.

| Token | px | Rol |
|---|---|---|
| `--fs-xs` | 12 | etiquetas, badges, meta, pies — **el suelo** |
| `--fs-s` | 13 | filas, botones, chips |
| `--fs-m` | 14 | cuerpo |
| `--fs-l` | 15 | nombre de fila, énfasis en línea |
| `--fs-xl` | 17 | título de sección (`.sect-t`): tiene que leerse por encima de las filas |
| `--fs-2xl` | 20 | cifra destacada |

Fuera de la escala, a propósito, las cinco cifras-héroe: 25 (`.dw-h h2`), 30
(`.dw-count b`, `.mini b`), 38 y 46 (`.goal-v b`). Un tamaño nuevo se elige de
la tabla; si ninguno sirve, la pregunta es si el elemento está bien diseñado.

Antes de esto había 20 tamaños distintos en 102 declaraciones, 46 de ellas con
medios píxeles y 49 por debajo de 12 px — el suelo de 10 px caía justo en los
badges y etiquetas que codifican estado.

## Forma y espacio

| Token | Valor | Uso |
|---|---|---|
| `--r` | 12 px | tarjeta, panel, cajón, tiles grandes |
| `--r-s` | 8 px | fila, chip, botón, tiles de icono (26–38 px) |
| `--r-xs` | 4 px | badge, check, chip diminuto |
| `--pad` | 22 px | respiro interno de tarjeta |
| `--gap` | 18 px | separación entre bloques |

Píldoras: `border-radius: 99px`. Círculos: `50 %`. Excepción micro: las pips
(5 px de alto) y las muestras de leyenda (8 px) llevan 2 px literales — a 4 px
serían círculos.

**Sombras: cuatro en toda la app**, y tres son `inset`. La única sombra
proyectada es la del cajón (`0 12px 32px rgba(0,0,0,.5)`), porque de verdad
flota. Esta restricción es el rasgo que más separa la app de una plantilla: las
tarjetas se separan por borde y superficie, nunca por sombra difusa. **No
agregues sombras.**

Los dos `inset` de color son marcadores de borde izquierdo: oro 2,5 px para la
fila activa, azul 2 px para la seleccionada.

Breakpoints: **1180 px** (el lateral de filtros se colapsa a riel) y **860 px**
(el lateral pasa a cajón). Los mismos dos números que usa `autoRail()` en
`primeFilters.ts` — si mueves uno, mueve el otro.

## Movimiento

- Entrada: clase `.rise` con `animationDelay` escalonado (60 → 240 ms) en las
  siete secciones de `Today`.
- `@keyframes fadeIn` (opacidad) y `slideIn` (36 px en X, para el cajón).
- Transiciones: **0,14 s** (28 usos) y **0,16 s** (14), más 0,12 y 0,2 sueltas.
- `prefers-reduced-motion: reduce` está respetado: mata `.rise` y baja toda
  transición a 0,01 ms. **Manténlo en cualquier animación nueva.**
- Foco: `outline: 2px solid var(--gold-bright)` con `offset: 2px`. El comentario
  del CSS explica por qué es oro pleno y no `--hair` — al 34 % el anillo se
  perdía sobre las superficies. No lo bajes.

## Inventario de componentes

Las clases van por familias con prefijo corto. Dónde vive cada una:

| Prefijo | Reglas CSS | Vista |
|---|---|---|
| `sect-` | 9 | cabecera de sección (`.sect-effort`, `.sect-x` para plegar), compartida por `Today`, `Mastery`, `History` |
| `next-` / `alt-` | 13 | «Tu próxima sesión» y sus alternativas (`Today`) |
| `rl-` | 28 | lista/grilla de primes (`Primes`) |
| `dw-` | 19 | el cajón de detalle (`PrimeDetail`, `GearDetail`) |
| `hunt-` | 18 | sección 00, objetivos (`Today`) |
| `pr-` / `pc-` / `pcard-` / `prow-` / `ph-` | 16 / 15 / 7 / 5 / 8 | tarjeta, fila y cabecera de prime (`Primes`) |
| `mast-` / `mi-` / `mrow-` / `extra-` | 13 / 4 / 4 / 6 | maestría |
| `goal-` | 11 | las dos tarjetas de meta (`Today`, `PrimeDetail`) |
| `hs-` / `rows-` / `mrx-` / `ppill-` | 7 / 3 / 4 / 2 | panel de Hoy |
| `chip-` / `pbar-` / `pin-` / `search-` | 3 / 1 / 1 / 3 | controles de filtro |
| `rr-` / `comp-` | 4 / 3 | reliquias y componentes en el cajón |
| `gd-` / `res` / `hs-have` / `hstep--gear` | 1 / 5 / 2 / 1 | piezas y recursos de equipo normal (`GearDetail`, sección 00 de `Today`) |
| `spark-` | 1 | la curva de XP (`History`) |

Iconos: SVG inline en `components/Icon.tsx` — 17 paths (`relic`, `sync`,
`check`, `alert`, `info`, `chevron`, `arrow`, `search`, `plus`, `minus`,
`close`, `hammer`, `star`, `note`, `down`, `up`, `mastery`). Añade el path ahí
antes de meter un `<svg>` suelto en una vista.

## Reglas

1. **Un color = un significado.** Si necesitas un color nuevo, primero di qué
   estado nuevo representa.
2. **Sin sombras proyectadas** salvo lo que de verdad flota sobre el contenido.
3. **Las cifras van en `--d`** (Space Grotesk), con la clase `.n`.
4. **Toda animación respeta `prefers-reduced-motion`.**
5. **El foco visible no se toca.**
6. **La escalera de Hoy se etiqueta por esfuerzo, no por número.** El orden
   (sin farmear → hay que farmear → en la foundry → solo jugar) es la tesis de
   la app y no se reordena. Los ordinales 00–04 decían que había orden pero no
   el criterio, y el pie tenía que explicarlo; la etiqueta `.sect-effort` lo
   dice sola. «Tu próxima sesión» va tras las metas y los objetivos —
   primero dónde estás, luego qué persigues, y entonces qué hacer — como cabeza
   de la escalera, con la misma cabecera que las demás secciones. En escritorio
   nacen abiertas las de consulta diaria; «sube de rango» y el desglose, plegadas.

## Deuda conocida

Medida, no opinada. Lo que quedaba tras el pase de tipografía y radios
(escala, suelo de 12 px, `--text-faint` a AA, radios a token — resuelto):

1. **13 valores distintos de `letter-spacing`**, de −0,02 a 0,24 em. Son tres
   intenciones (negativo para display, 0,02–0,06 para cuerpo, 0,1–0,24 para
   etiquetas espaciadas) repartidas en trece números.
2. **Siete entradas escalonadas** en `Today`. Un fade-and-slide-up por sección
   es el default que las guías de diseño señalan como generado; un solo momento
   orquestado rinde más que siete. (`prefers-reduced-motion` ya lo cubre para
   quien lo pide, pero el default lo ve todo el mundo.)
3. **29 tokens `--*-glow`** en un tema oscuro. Cada uno tiene sentido por
   separado; conviene mirar si el conjunto suma a "oscuro con acentos que
   brillan", que es un patrón muy visto.
4. **Prefijos opacos:** `rl`, `dw`, `ph`, `rr`, `hs`, `mrx`, `mi` no se
   entienden sin buscarlos. La tabla de arriba es el mapa que faltaba; renombrar
   es opcional, documentar era obligatorio.
