# Prime Ledger

Tracker personal de Warframe con dos metas:

1. **Completar todo lo Prime** — checklist por pieza, con reliquias, dónde
   farmearlas hoy y con qué probabilidad.
2. **Llegar a MR 30+** — checklist de maestría de todo el equipo, más XP de
   star chart, junctions e intrínsecos.

## Comandos

```bash
pnpm dev          # abrir la app (localhost:5173)
pnpm build:data   # regenerar src/data/game-data.json tras cada parche
pnpm build        # type-check + build de producción
```

## Fuentes de datos

| Qué | Fuente |
|---|---|
| Catálogo de ítems, primes, componentes, reliquias, ducats, imágenes | [`@wfcd/items`](https://www.npmjs.com/package/@wfcd/items) (se actualiza con cada parche — correr `pnpm build:data` tras actualizar la dep) |
| Tablas de drop en vivo (qué reliquia cae hoy, dónde y con qué %) | [drops.warframestat.us](https://drops.warframestat.us) (`all.json`, data oficial de DE) |
| Imágenes | `cdn.warframestat.us/img/…` |

Una reliquia se considera **activa (farmeable hoy)** si aparece en alguna tabla
de drop vigente: misiones del star chart / Railjack, bounties (Cetus, Fortuna,
Deimos, Zariman, Sanctum, Höllvania) u objetivos transitorios. Si ninguna
reliquia de un prime está activa, el prime se marca **Vault** (se consigue vía
Varzia / trading — cada pieza tiene link directo a warframe.market).

## Tu progreso

- Se guarda en `localStorage` del navegador (`prime-tracker:v1`).
- **Historial**: cada pieza / construcción / maestría que marcas queda
  registrada con fecha; la pestaña Historial muestra la línea de tiempo y la
  curva de XP acumulada.
- **Respaldo**: pestaña Historial → *Exportar respaldo JSON* (y también
  importa). Exporta seguido: si limpias el navegador se pierde el localStorage.

## Matemática de maestría

- MR n = `2500 × n²` XP → MR 30 = 2.250.000 XP.
- Armas 100 XP/rango (cap 30 = 3.000; Kuva/Tenet/Coda/Paracesis cap 40 = 4.000).
- Warframes / companions / archwings 200 XP/rango (6.000); Necramechs hasta 8.000.
- Junctions 1.000 c/u (14 normales + 14 Steel Path).
- Intrínsecos Railjack y Drifter: 1.500 por rango (50 + 50 rangos).
- Star chart: máx ≈ 27.519 XP por lado (normal / Steel Path) — se ingresa
  manualmente en la pestaña Maestría.

## Actualizar después de un parche

```bash
pnpm up @wfcd/items && pnpm build:data
```

## Pendiente (v2)

- Importar inventario real desde AlecaFrame (`lastData.dat` / API de reliquias
  con token público) para marcar todo automáticamente.
- Precios en vivo de warframe.market para decidir farmear vs comprar.
- Contador de ducats de partes duplicadas para Baro Ki'Teer.
