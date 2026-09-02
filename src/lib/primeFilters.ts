import type { Prime, Progress } from '../types';
import { CATEGORY_LABEL, MASTERY_GEAR, PRIMES, partsNeeded, relicSources } from './gameData';
import { acquisition, ownedParts, primeStatus, relicOwned } from './selectors';
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

/**
 * El eje de Estado presenta `missing` y `partial` fusionados: un estado es un
 * paso del proceso — algo que cambia lo que haces — y farmear una pieza es
 * idéntico con 0 o con 3. La cercanía es una cantidad y ya la comunican las
 * pips, el «2/4» y el orden por progreso. `partial` sigue existiendo por
 * debajo: lo usan el orden por estado, la barra de Hoy y `tally()`.
 */
export type EstadoKey = 'pending' | 'ready' | 'built' | 'mastered';

export const uiStatus = (st: PrimeStatus): EstadoKey =>
  st === 'missing' || st === 'partial' ? 'pending' : st;

/** Singular: describe UN prime (el badge de la tarjeta y la fila). */
export const ESTADO_LABEL: Record<EstadoKey, string> = {
  pending: 'Pendiente',
  ready: 'Piezas listas',
  built: 'Construido',
  mastered: 'Masterizado',
};

/** Plural: describe un grupo (el filtro del lateral). */
export const ESTADOS: Opt<EstadoKey>[] = [
  { id: 'pending', label: 'Pendientes' },
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

/* ── vistas guardadas ───────────────────────────────────────
   Las preguntas frecuentes, con nombre. Los nombres describen ESTADOS del
   catálogo, nunca acciones: los verbos («abre», «farmea», «construye») son el
   terreno de Hoy. «Falta 1 pieza» y «Mis objetivos» no son expresables con
   los ejes (miran cantidades y targets), así que una vista es un PREDICADO
   que corre antes de los filtros, no un conjunto de casillas guardado. */

export type PresetId = 'reach' | 'oneLeft' | 'ready' | 'targets' | 'all';

export const PRESETS: { id: PresetId; label: string; pred: (r: Row, progress: Progress) => boolean }[] = [
  /**
   * «A mi alcance» = todo lo que puedes conseguir sin tradear: reliquia
   * activa hoy O reliquia tuya en inventario — una llave tuya se abre igual
   * aunque el prime esté en el Vault (caso Nami Skyla: todas sus reliquias
   * vaulteadas, pero las tienes). Solo con `farmableNow` la vista era un
   * alias exacto de la casilla "Farmeable hoy". `acquisition()` devuelve
   * todo-false para construidos/masterizados (las piezas consumidas al
   * craftear parecían "faltantes"), así que ambos flags implican pendiente.
   */
  { id: 'reach', label: 'A mi alcance', pred: (r) => r.acq.farmableNow || r.acq.hasRelics },
  { id: 'oneLeft', label: 'Falta 1 pieza', pred: (r) => r.total - r.owned === 1 && r.st !== 'built' && r.st !== 'mastered' },
  { id: 'ready', label: 'Piezas listas', pred: (r) => r.st === 'ready' },
  { id: 'targets', label: 'Mis objetivos', pred: (r, progress) => progress.targets[r.p.name] === true },
  { id: 'all', label: 'Todo', pred: () => true },
];

export interface FilterResult {
  list: Row[];
  /** conteo por opción, ya contextualizado */
  counts: Record<Group, Record<string, number>>;
  /** cuántos filtros hay puestos, búsqueda incluida */
  active: number;
}

/**
 * OR dentro de cada grupo, AND entre grupos, y **un grupo vacío no filtra**:
 * así "Pendientes" sin tocar el resto devuelve el estado completo, esté o no
 * disponible el prime. No marcar nada *es* verlo todo.
 */
export function filterPrimes(rows: Row[], sets: Sets, q: string): FilterResult {
  const needle = q.trim().toLowerCase();
  const { estado, consigo, tipo } = sets;

  const mQ = (r: Row) => !needle || r.p.name.toLowerCase().includes(needle);
  const mE = (r: Row) => estado.size === 0 || estado.has(uiStatus(r.st));
  const mC = (r: Row) => consigo.size === 0 || CONSIGO.some((o) => consigo.has(o.id) && r.acq[o.id]);
  const mT = (r: Row) => tipo.size === 0 || tipo.has(r.p.category);

  // Conteos contextuales: cada grupo se cuenta aplicando los OTROS grupos,
  // nunca el suyo. Así el número de la casilla es el que verías al marcarla,
  // y ninguna casilla anuncia resultados que no existen.
  const estadoN: Record<string, number> = {};
  const consigoN: Record<string, number> = {};
  const tipoN: Record<string, number> = {};
  const list: Row[] = [];

  for (const r of rows) {
    const okQ = mQ(r);
    const okE = mE(r);
    const okC = mC(r);
    const okT = mT(r);
    const eKey = uiStatus(r.st);
    if (okQ && okC && okT) estadoN[eKey] = (estadoN[eKey] ?? 0) + 1;
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
   chip de orden y las cabeceras clicables de la lista mueven lo mismo. */

export type SortKey = 'release' | 'name' | 'progress' | 'xp' | 'status' | 'acq';
export type Dir = 'asc' | 'desc';
export type Sort = { key: SortKey; dir: Dir };

/** La dirección con la que cada criterio es útil al elegirlo por primera vez:
 *  nadie ordena por progreso para ver primero lo que ni ha empezado. */
export const NATURAL_DIR: Record<SortKey, Dir> = {
  release: 'desc',
  name: 'asc',
  progress: 'desc',
  xp: 'desc',
  status: 'asc',
  acq: 'asc',
};

export const SORTS: { id: SortKey; label: string; short: string }[] = [
  { id: 'release', label: 'Novedad', short: 'Salida' },
  { id: 'status', label: 'Estado', short: 'Estado' },
  { id: 'progress', label: 'Progreso', short: 'Piezas' },
  { id: 'name', label: 'Nombre', short: 'Prime' },
  { id: 'xp', label: 'XP de maestría', short: 'XP' },
  { id: 'acq', label: 'Consigo', short: 'Consigo' },
];

/**
 * El orden de siempre, con nombre. `build-data.mjs:171` ya emite el catálogo
 * por fecha de salida descendente y desempatado por nombre, así que este
 * default reproduce exactamente lo que veías antes de que existiera el
 * control de orden — volver atrás es elegir "Novedad", no limpiar nada.
 */
export const DEFAULT_SORT: Sort = { key: 'release', dir: 'desc' };

/** Orden de progresión, el mismo del eje Estado: lo que ni has tocado primero.
 *  Sigue distinguiendo missing de partial aunque el filtro los fusione — la
 *  cercanía es información y aquí sí ordena. */
const STATUS_RANK: Record<PrimeStatus, number> = { missing: 0, partial: 1, ready: 2, built: 3, mastered: 4 };

/** Orden de accionabilidad: lo farmeable primero, lo completo al final. */
const acqRank = (r: Row): number => {
  if (r.st === 'built' || r.st === 'mastered' || r.owned >= r.total) return 3;
  if (r.acq.farmableNow) return 0;
  if (r.acq.hasRelics) return 1;
  return 2;
};

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
    acq: (a, b) => acqRank(a) - acqRank(b),
  };
  // Copia: `rows` viene memoizado del progreso y ordenarlo en sitio lo
  // mutaría entre renders. Desempate por nombre para que el orden sea estable.
  return [...rows].sort((a, b) => sign * cmp[key](a, b) || a.p.name.localeCompare(b.p.name));
}

/* ── siguiente paso ─────────────────────────────────────────
   El pie de la tarjeta: qué harías AHORA con este prime, en una línea. La
   misma cascada que AcqBadge, pero con el dato concreto (nodo, reliquia,
   piezas) en vez de la categoría. */

const fmtN = (n: number) => n.toLocaleString('es-CO');

export function nextStep(r: Row, progress: Progress): string {
  const { p, st, acq, owned, total, xp } = r;
  const xpTxt = xp > 0 ? ` · ${fmtN(xp)} XP` : '';
  if (st === 'mastered') return xp > 0 ? `${fmtN(xp)} XP ya contados` : 'Masterizado';
  if (st === 'built') return `Súbelo a rango tope${xpTxt}`;
  if (st === 'ready') return `Constrúyelo${xpTxt}`;

  // Sin componentes en el catálogo (War, Verglas, Gotva y las armas de
  // centinela): siguen siendo Pendientes, pero no hay piezas que farmear —
  // vienen completos con su quest, su centinela o su evento. Genérico y
  // honesto: no afirmar Varzia ni farmeo que el dato no respalda.
  if (total === 0) return 'Se consigue completo';

  const isPending = (c: Prime['components'][number]) =>
    c.count - Math.min(progress.parts[c.fullName] ?? 0, c.count) > 0;

  if (acq.farmableNow) {
    // la reliquia activa con mejor probabilidad radiante entre lo pendiente
    let best: { relic: string; chance: number } | null = null;
    for (const c of p.components) {
      if (!isPending(c)) continue;
      for (const ref of c.relics) {
        if (!ref.active) continue;
        const ch = ref.chances.Radiant ?? 0;
        if (!best || ch > best.chance) best = { relic: ref.relic, chance: ch };
      }
    }
    const src = best ? relicSources(best.relic)[0] : undefined;
    if (src) {
      // "Camenae (Sedna)" → "Camenae · Sedna", el formato del resto del pie
      const where = src.where.replace(/\s*\(([^)]+)\)$/, ' · $1');
      return `${where} · ${best!.chance.toFixed(1)}%`;
    }
  }
  if (acq.hasRelics) {
    // la reliquia tuya con más copias que aún suelte algo pendiente
    let best: { relic: string; copies: number } | null = null;
    for (const c of p.components) {
      if (!isPending(c)) continue;
      for (const ref of c.relics) {
        const n = relicOwned(progress, ref.relic);
        if (n > 0 && (!best || n > best.copies)) best = { relic: ref.relic, copies: n };
      }
    }
    // "tienes N" = copias de esa reliquia en tu inventario: cuántos intentos
    // tienes, que es el dato accionable (no cuántas piezas suelta)
    if (best) return `Abre ${best.relic} · tienes ${best.copies}`;
  }
  const missing = total - owned;
  return `Varzia o mercado · ${missing} pieza${missing === 1 ? '' : 's'}`;
}

/* ── persistencia ───────────────────────────────────────────
   Los filtros, el orden, la vista y el lateral sobreviven el cambio de
   pestaña: `App` desmonta la vista al navegar, y volver a marcar cinco
   casillas cada vez era peaje puro. Mismo trato que siempre: preferencias
   desechables, cualquier error de lectura cae al valor por defecto. */

export type View = 'cards' | 'list';

const LS_FILTERS = 'prime-tracker:primes-filters';
const LS_VIEW = 'prime-tracker:primes-view';

export interface ViewState {
  view: View;
  sort: Sort;
  /** vista guardada activa; null = «Todo + filtros» (ninguna marcada) */
  preset: PresetId | null;
  /** lateral abierto o colapsado a riel */
  railOpen: boolean;
}

/** Sin preferencia guardada, el lateral abre según el ancho: ≥1180 abierto,
 *  860–1180 colapsado. Bajo 860 es un cajón y este booleano no aplica. */
const autoRail = () => (typeof matchMedia === 'function' ? matchMedia('(min-width: 1180px)').matches : true);

export function loadView(): ViewState {
  const fallback: ViewState = { view: 'cards', sort: DEFAULT_SORT, preset: 'all', railOpen: autoRail() };
  try {
    const raw = localStorage.getItem(LS_VIEW);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as { view?: string; key?: string; dir?: string; savedView?: unknown; railOpen?: unknown };
    return {
      view: p.view === 'list' ? 'list' : 'cards',
      sort: {
        key: SORTS.some((s) => s.id === p.key) ? (p.key as SortKey) : DEFAULT_SORT.key,
        dir: p.dir === 'desc' ? 'desc' : 'asc',
      },
      // `savedView` no existía antes de las vistas: los guardados viejos caen a «Todo»
      preset: PRESETS.some((v) => v.id === p.savedView) ? (p.savedView as PresetId) : p.savedView === null ? null : 'all',
      railOpen: typeof p.railOpen === 'boolean' ? p.railOpen : autoRail(),
    };
  } catch {
    return fallback;
  }
}

export function saveView(view: View, sort: Sort, preset: PresetId | null, railOpen: boolean) {
  try {
    localStorage.setItem(LS_VIEW, JSON.stringify({ view, key: sort.key, dir: sort.dir, savedView: preset, railOpen }));
  } catch {
    /* igual que los filtros: preferencia desechable, no vale romper por esto */
  }
}

/** El eje Estado pasó de 5 opciones a 4: los guardados viejos con `missing`
 *  o `partial` marcados migran a `pending` en la lectura, sin tocar el disco. */
const MIGRATE_ESTADO: Record<string, EstadoKey> = { missing: 'pending', partial: 'pending' };
const VALID_ESTADO = new Set<string>(ESTADOS.map((o) => o.id));

export function loadFilters(): Sets {
  try {
    const raw = localStorage.getItem(LS_FILTERS);
    if (!raw) return emptySets();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const set = (k: Group) => new Set(Array.isArray(parsed[k]) ? (parsed[k] as string[]) : []);
    const estado = new Set(
      [...set('estado')].map((id) => MIGRATE_ESTADO[id] ?? id).filter((id) => VALID_ESTADO.has(id)),
    );
    return { estado, consigo: set('consigo'), tipo: set('tipo') };
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
