import type { Prime, Progress } from '../types';
import { CATEGORY_LABEL, MASTERY_GEAR, PRIMES, partsNeeded } from './gameData';
import { acquisition, ownedParts, primeStatus } from './selectors';
import type { Acquisition, PrimeStatus } from './selectors';

/**
 * Los tres de Founders (Excalibur, Skana, Lato Prime) no se consiguen de
 * ninguna forma hoy, así que quedan fuera del catálogo y de todos los conteos.
 * Antes los conteos los saltaban pero la grilla no, y el pie comparaba contra
 * `PRIMES.length`: tres números distintos para la misma lista. Si entraran,
 * además, vivirían para siempre en "Faltantes" inflando el que más miras.
 */
export const CATALOG: Prime[] = PRIMES.filter((p) => !p.founders);

export type Opt<T extends string> = { id: T; label: string; tone?: 'teal' | 'blue' | 'red' };

export const ESTADOS: Opt<PrimeStatus>[] = [
  { id: 'missing', label: 'Faltantes' },
  { id: 'partial', label: 'En progreso' },
  { id: 'ready', label: 'Piezas listas' },
  { id: 'built', label: 'Construidos' },
  { id: 'mastered', label: 'Masterizados' },
];

/**
 * Eje aparte del estado, y multi-select como él: un prime puede estar *en
 * progreso* Y *en Vault* a la vez. Meterlos en el mismo grupo excluyente hacía
 * imposible la pregunta que da sentido a la app — "¿qué me falta que pueda
 * conseguir hoy?" — y las dos primeras opciones se solapan a propósito, porque
 * tener reliquias guardadas de un vaulteado también es poder farmearlo.
 */
export type AcqKey = keyof Acquisition;
export const CONSIGO: Opt<AcqKey>[] = [
  { id: 'farmableNow', label: 'Farmeable hoy', tone: 'teal' },
  { id: 'hasRelics', label: 'Tengo reliquias', tone: 'blue' },
  { id: 'tradeOnly', label: 'Solo trading', tone: 'red' },
];

/** Derivado de la data, no a mano: el array fijo traía `Arch-Melee`, que no
 *  existe en el catálogo, y era un chip muerto que siempre daba cero. */
const CAT_ORDER = [
  'Warframes', 'Primary', 'Secondary', 'Melee', 'Sentinels',
  'Pets', 'Arch-Gun', 'Arch-Melee', 'Archwing', 'Necramech', 'Misc',
];
export const CATS: Opt<string>[] = (() => {
  const present = new Set(CATALOG.map((p) => p.category));
  const ordered = [
    ...CAT_ORDER.filter((c) => present.has(c)),
    ...[...present].filter((c) => !CAT_ORDER.includes(c)),
  ];
  return ordered.map((c) => ({ id: c, label: CATEGORY_LABEL[c] ?? c }));
})();

export type Group = 'estado' | 'consigo' | 'tipo';
export type Sets = Record<Group, Set<string>>;

export const emptySets = (): Sets => ({ estado: new Set(), consigo: new Set(), tipo: new Set() });

export interface Row {
  p: Prime;
  st: PrimeStatus;
  acq: Acquisition;
  owned: number;
  total: number;
  /** XP de maestría del prime, 0 si no es masterizable */
  xp: number;
  /** fecha de salida ISO; '' si el catálogo no la trae */
  released: string;
}

/** El XP vive en `MASTERY_GEAR`, que es una lista: buscarlo por prime dentro
 *  del render era un `.find()` por tarjeta y por reordenamiento. */
const XP_BY_NAME = new Map(MASTERY_GEAR.map((g) => [g.name, g.xp]));

export const buildRows = (progress: Progress): Row[] =>
  CATALOG.map((p) => ({
    p,
    st: primeStatus(p, progress),
    acq: acquisition(p, progress),
    owned: ownedParts(p, progress),
    total: partsNeeded(p),
    xp: XP_BY_NAME.get(p.name) ?? 0,
    released: p.releaseDate ?? '',
  }));

export interface FilterResult {
  list: Row[];
  /** conteo por chip, ya contextualizado */
  counts: Record<Group, Record<string, number>>;
  /** cuántos filtros hay puestos, búsqueda incluida */
  active: number;
}

/**
 * OR dentro de cada grupo, AND entre grupos, y **un grupo vacío no filtra**:
 * así "Faltantes + En progreso" sin tocar el resto devuelve los dos estados
 * completos, esté o no disponible el prime. Por eso ya no hace falta el chip
 * "Todos" — no marcar nada *es* verlo todo.
 */
export function filterPrimes(rows: Row[], sets: Sets, q: string): FilterResult {
  const needle = q.trim().toLowerCase();
  const { estado, consigo, tipo } = sets;

  const mQ = (r: Row) => !needle || r.p.name.toLowerCase().includes(needle);
  const mE = (r: Row) => estado.size === 0 || estado.has(r.st);
  const mC = (r: Row) => consigo.size === 0 || CONSIGO.some((o) => consigo.has(o.id) && r.acq[o.id]);
  const mT = (r: Row) => tipo.size === 0 || tipo.has(r.p.category);

  // Conteos contextuales: cada grupo se cuenta aplicando los OTROS grupos,
  // nunca el suyo. Así el número del chip es el que verías al marcarlo, y
  // ningún chip anuncia resultados que no existen.
  const estadoN: Record<string, number> = {};
  const consigoN: Record<string, number> = {};
  const tipoN: Record<string, number> = {};
  const list: Row[] = [];

  for (const r of rows) {
    const okQ = mQ(r);
    const okE = mE(r);
    const okC = mC(r);
    const okT = mT(r);
    if (okQ && okC && okT) estadoN[r.st] = (estadoN[r.st] ?? 0) + 1;
    if (okQ && okE && okT) for (const o of CONSIGO) if (r.acq[o.id]) consigoN[o.id] = (consigoN[o.id] ?? 0) + 1;
    if (okQ && okE && okC) tipoN[r.p.category] = (tipoN[r.p.category] ?? 0) + 1;
    if (okQ && okE && okC && okT) list.push(r);
  }

  return {
    list,
    counts: { estado: estadoN, consigo: consigoN, tipo: tipoN },
    active: estado.size + consigo.size + tipo.size + (needle ? 1 : 0),
  };
}

/* ── orden ──────────────────────────────────────────────────
   Con 167 primes en pantalla, un solo orden fijo no responde todo. No existe
   un estado "sin ordenar": el orden de siempre era por novedad y ahora es una
   opción más, la de por defecto. El mismo estado sirve a las dos vistas: el
   `<select>` en tarjetas y las cabeceras clicables en lista mueven lo mismo. */

export type SortKey = 'release' | 'name' | 'progress' | 'xp' | 'status';
export type Dir = 'asc' | 'desc';
export type Sort = { key: SortKey; dir: Dir };

/** La dirección con la que cada criterio es útil al elegirlo por primera vez:
 *  nadie ordena por progreso para ver primero lo que ni ha empezado. */
const NATURAL_DIR: Record<SortKey, Dir> = {
  release: 'desc',
  name: 'asc',
  progress: 'desc',
  xp: 'desc',
  status: 'asc',
};

export const SORTS: { id: SortKey; label: string; short: string }[] = [
  { id: 'release', label: 'Novedad', short: 'Salida' },
  { id: 'status', label: 'Estado', short: 'Estado' },
  { id: 'progress', label: 'Progreso', short: 'Piezas' },
  { id: 'name', label: 'Nombre', short: 'Prime' },
  { id: 'xp', label: 'XP de maestría', short: 'XP' },
];

/**
 * El orden de siempre, con nombre. `build-data.mjs:171` ya emite el catálogo
 * por fecha de salida descendente y desempatado por nombre, así que este
 * default reproduce exactamente lo que veías antes de que existiera el
 * control de orden — volver atrás es elegir "Novedad", no limpiar nada.
 */
export const DEFAULT_SORT: Sort = { key: 'release', dir: 'desc' };

/** Orden de progresión, el mismo de los chips: lo que ni has tocado primero. */
const STATUS_RANK: Record<PrimeStatus, number> = { missing: 0, partial: 1, ready: 2, built: 3, mastered: 4 };

/** Clic en un criterio: si ya estaba activo invierte, si no arranca en su
 *  dirección natural. */
export const nextSort = (current: Sort, key: SortKey): Sort =>
  current.key === key
    ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: NATURAL_DIR[key] };

export function sortRows(rows: Row[], { key, dir }: Sort): Row[] {
  const sign = dir === 'asc' ? 1 : -1;
  const frac = (r: Row) => (r.total > 0 ? r.owned / r.total : 0);
  const cmp: Record<SortKey, (a: Row, b: Row) => number> = {
    release: (a, b) => a.released.localeCompare(b.released),
    name: (a, b) => a.p.name.localeCompare(b.p.name),
    progress: (a, b) => frac(a) - frac(b) || a.owned - b.owned,
    xp: (a, b) => a.xp - b.xp,
    status: (a, b) => STATUS_RANK[a.st] - STATUS_RANK[b.st],
  };
  // Copia: `rows` viene memoizado del progreso y ordenarlo en sitio lo
  // mutaría entre renders. Desempate por nombre para que el orden sea estable.
  return [...rows].sort((a, b) => sign * cmp[key](a, b) || a.p.name.localeCompare(b.p.name));
}

/* ── persistencia ───────────────────────────────────────────
   Los filtros, el orden y la vista sobreviven el cambio de pestaña: `App`
   desmonta la vista al navegar, y volver a marcar cinco chips cada vez era
   peaje puro. */

export type View = 'cards' | 'list';

const LS_FILTERS = 'prime-tracker:primes-filters';
const LS_VIEW = 'prime-tracker:primes-view';

export function loadView(): { view: View; sort: Sort } {
  const fallback = { view: 'cards' as View, sort: DEFAULT_SORT };
  try {
    const raw = localStorage.getItem(LS_VIEW);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as { view?: string; key?: string; dir?: string };
    return {
      view: p.view === 'list' ? 'list' : 'cards',
      sort: {
        key: SORTS.some((s) => s.id === p.key) ? (p.key as SortKey) : DEFAULT_SORT.key,
        dir: p.dir === 'desc' ? 'desc' : 'asc',
      },
    };
  } catch {
    return fallback;
  }
}

export function saveView(view: View, sort: Sort) {
  try {
    localStorage.setItem(LS_VIEW, JSON.stringify({ view, key: sort.key, dir: sort.dir }));
  } catch {
    /* igual que los filtros: preferencia desechable, no vale romper por esto */
  }
}

export function loadFilters(): Sets {
  try {
    const raw = localStorage.getItem(LS_FILTERS);
    if (!raw) return emptySets();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const set = (k: Group) => new Set(Array.isArray(parsed[k]) ? (parsed[k] as string[]) : []);
    return { estado: set('estado'), consigo: set('consigo'), tipo: set('tipo') };
  } catch {
    return emptySets();
  }
}

export function saveFilters(sets: Sets) {
  try {
    localStorage.setItem(
      LS_FILTERS,
      JSON.stringify({ estado: [...sets.estado], consigo: [...sets.consigo], tipo: [...sets.tipo] }),
    );
  } catch {
    /* modo privado o cuota llena: los filtros son desechables, no vale romper por esto */
  }
}

export function toggle(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (!next.delete(id)) next.add(id);
  return next;
}
