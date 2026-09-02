---
name: patch-refresh
description: Actualizar el catálogo de Warframe tras un parche — sube @wfcd/items, regenera src/data/game-data.json y revisa qué cambió (primes nuevos, reliquias que entran o salen del Vault, masterizables, categorías sin etiqueta). Usar cuando el usuario mencione un parche nuevo, datos desactualizados, "pnpm build:data", primes que faltan en la app, o reliquias mal marcadas como activas o vaulteadas.
---

# Refrescar el catálogo tras un parche

`src/data/game-data.json` es generado y son ~950 KB en una línea: su diff de git
no se puede leer, así que un cambio de upstream entra sin que nadie lo note.
Este es el ritual para actualizarlo **y saber qué cambió**.

## Procedimiento

**1. Foto del catálogo actual** (antes de tocar nada):

```bash
node .claude/skills/patch-refresh/snapshot.mjs > /tmp/pl-antes.json
```

Usa el directorio de scratchpad de la sesión si lo tienes; `/tmp` sirve igual.

**2. Sube la dependencia y regenera.** Guarda la salida: `build-data.mjs`
imprime warnings que importan.

```bash
pnpm up @wfcd/items && pnpm build:data
```

Presta atención a:
- `! no relic components matched for <X>` — un prime cuyas piezas no calzaron
  con ninguna recompensa de reliquia. Si es un prime nuevo y normal, la
  convención de nombres de `@wfcd/items` cambió y hay que arreglar los
  `candidates` en `build-data.mjs`. En los de evento o quest (War, Verglas,
  Gotva) es esperado y correcto.
- `masterable Misc types:` — un tipo nuevo aquí puede necesitar entrar en la
  excepción de `FRAME_LIKE` / `Kitgun Component` (define si el ítem rinde 100 o
  200 XP por rango).
- `build deps:` — si el número de ingredientes o consumidores se desploma, la
  detección por `uniqueName` se rompió.

**3. Diff legible:**

```bash
node .claude/skills/patch-refresh/snapshot.mjs /tmp/pl-antes.json
```

Reporta al usuario, en este orden:
- primes nuevos (y si son farmeables o entran directo al Vault);
- primes que entran o salen del Vault — es el dato que más le cambia el plan;
- masterizables nuevos (XP nuevo que persigue MR 30);
- avisos `⚠` de categorías sin etiqueta.

**4. Si el diff avisa de una categoría nueva**, añádela en los dos mapas
mantenidos a mano — no basta con uno:
- `CATEGORY_LABEL` en `src/lib/gameData.ts` (el nombre en español);
- `CAT_ORDER` en `src/lib/primeFilters.ts` (dónde va en el filtro de tipo).

**5. Verifica y cierra:**

```bash
pnpm lint && pnpm build
```

Un salto grande y raro en los conteos (cientos de masterizables, o
`activeRelics` en 0) casi nunca es un parche: es `drops.warframestat.us`
respondiendo mal. `activeRelics: 0` significa que la app marcaría **todo** como
Vault — no commitees eso, vuelve a correr `pnpm build:data` más tarde.

## Al commitear

`game-data.json` va commiteado a propósito (el build de Pages no debe depender
de la red). El commit incluye el JSON regenerado y, si la subió, la nueva
versión de `@wfcd/items` en `package.json` + `pnpm-lock.yaml`. Mensaje en el
estilo del repo, describiendo el efecto:
`chore(data): catálogo al <fecha> — <N> primes nuevos, <M> salen del Vault`.

El despliegue semanal (`.github/workflows/deploy.yml`, lunes 10:00 UTC) ya hace
esto solo con `@wfcd/items@latest` de forma efímera, sin commitear. Correr esta
skill sirve para **ver** qué cambió y para dejar el repo local al día.
