# Prime Ledger

SPA de React 19 + Vite + TS, sin backend, desplegada en GitHub Pages. Tracker
personal de Warframe con dos metas: completar todo lo Prime y llegar a MR 30+.
Todo el progreso del usuario vive en `localStorage`; el sitio es el mismo para
todos.

## Comandos

```bash
pnpm dev          # localhost:5173
pnpm build        # tsc -b + vite build  ← única red de seguridad, no hay tests
pnpm lint         # oxlint
pnpm build:data   # regenera src/data/game-data.json (tras cada parche)
```

## Reglas que no son adivinables

**`src/data/game-data.json` es generado — nunca editarlo a mano.** Sale de
`scripts/build-data.mjs` (≈950 KB, commiteado a propósito para que el build de
Pages no dependa de la red). Si un dato está mal, se arregla en el script, no en
el JSON. Para actualizarlo tras un parche, usa la skill `/patch-refresh`.

**Español, y el comentario explica el *por qué*.** El código y los comentarios
están en español. El estilo del repo documenta la decisión y a menudo el bug que
la causó, no lo que la línea siguiente ya dice. Igualalo: si añades una regla no
obvia, escribe por qué existe.

**Los 3 primes de Founders quedan fuera de todo.** Excalibur, Skana y Lato Prime
no se consiguen hoy. `CATALOG` (en `primeFilters.ts`) los filtra y los conteos
los saltan: el número correcto es 167, no los 170 que trae el catálogo. Ver el
comentario de `CATALOG` — ya hubo un bug de tres números distintos para la misma
lista.

**El progreso se indexa por nombre, no por `uniqueName`.** `Progress.parts`,
`mastered`, `ranks`, `built` y `targets` son mapas por nombre visible. De ahí la
deduplicación de `MASTERY_GEAR` en `gameData.ts` (dos "Grimoire" distintos
colisionan). Cambiar esto es una migración, no un refactor.

**`Progress` tiene versión (`v: 1`).** Añadir un campo obliga a rellenarlo en
`load()` y en `importJson()` de `store.tsx`: hay guardados viejos en el
navegador de la gente que no lo traen, y los lectores asumen que existe. Mira
cómo entraron `relics`, `targets` y `ranks`.

**El XP de maestría se gana por rango, no al llegar al tope.** `earnedXp()`
cuenta la fracción del rango alcanzado (`Progress.ranks`). Un arma en 15/30 ya
dio la mitad — no la trates como pendiente completa.

**Mapas mantenidos a mano que un parche puede dejar cortos:**
`CATEGORY_LABEL` (`gameData.ts`) y `CAT_ORDER` (`primeFilters.ts`). Una
categoría nueva del catálogo no aparece rota, aparece sin etiqueta o al final.
`/patch-refresh` lo revisa.

## Cómo está repartido

- `lib/gameData.ts` — acceso al JSON generado + helpers de catálogo (slugs de
  warframe.market, imágenes del CDN).
- `lib/selectors.ts` — el corazón: qué puedes hacer hoy. `acquisition`,
  `openableRelics`, `farmByMission`, `buildReady`, `levelUpQueue`, `huntList`.
- `lib/primeFilters.ts` — ejes de filtro (OR dentro de cada grupo, AND entre
  grupos, **grupo vacío no filtra**), conteos contextuales, vistas guardadas
  como predicados, orden y persistencia de la UI.
- `lib/mastery.ts` — matemática de MR (`2500n²`; legendario
  `2.25M + 147.5K/LR`).
- `lib/aleca.ts` — descifra `lastData.dat` de AlecaFrame en el navegador. La
  data del usuario **nunca sale de su máquina**: cualquier cambio aquí mantiene
  esa propiedad.
- `lib/store.tsx` — reducer + Context + localStorage.
- `views/Today.tsx` — el panel: metas (dónde estás) → objetivos (qué persigues) →
  «Tu próxima sesión» (`nextSession()` en `selectors.ts`: la escalera resuelta
  en una recomendación, consciente de tus objetivos) → y, plegadas, las
  secciones en orden de esfuerzo: abre lo que ya tienes → farmea → construye →
  sube de rango. Ese orden es la
  tesis de la app; no lo reordenes por conveniencia visual.

## Diseño

**El sistema completo está en `DESIGN.md`: léelo antes de tocar cualquier cosa
visual.** Ahí están la paleta con su contraste medido, la escala tipográfica
real, las reglas (sin sombras proyectadas, un color = un significado) y la deuda
conocida.

Tema oscuro fijo. Los colores son semánticos y viven en `index.css` — úsalos,
no inventes hex nuevos:

| Token | Significa |
|---|---|
| `--gold` | la marca, y lo masterizado en acumulado |
| `--teal` | accionable ya |
| `--blue` | listo, sin usar |
| `--red` | vault / fuera de alcance |
| `--mastery` (blanco hielo) | el sigil de masterizado |
| `--rare` / `--uncommon` / `--common` | rareza de reliquia |

Iconos: SVG inline en `components/Icon.tsx`. Añade un path ahí antes de meter
un `<svg>` suelto en una vista.

## Mensajes de commit

En español, `tipo(ámbito): resumen en minúscula` — el resumen describe el efecto
para el usuario, no el cambio en el código:
`fix(ui): martillo que parece martillo y fila de ingrediente resaltada`.
