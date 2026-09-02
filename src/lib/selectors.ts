import type { BuildDep, MasteryItem, Prime, PrimeComponent, Progress, Refinement, RelicRef, RelicSource } from '../types';
import { MASTERY_GEAR, PRIMES, partsNeeded, relicSources } from './gameData';
import { fmt, pendingXp } from './mastery';

export type PrimeStatus = 'mastered' | 'built' | 'ready' | 'partial' | 'missing';

export const STATUS_LABEL: Record<PrimeStatus, string> = {
  mastered: 'Masterizado',
  built: 'Construido',
  ready: 'Piezas listas',
  partial: 'En progreso',
  missing: 'Faltante',
};

export function ownedParts(p: Prime, progress: Progress): number {
  return p.components.reduce(
    (n, c) => n + Math.min(progress.parts[c.fullName] ?? 0, c.count),
    0,
  );
}

export function primeStatus(p: Prime, progress: Progress): PrimeStatus {
  if (progress.mastered[p.name]) return 'mastered';
  if (progress.built[p.name]) return 'built';
  const owned = ownedParts(p, progress);
  if (owned >= partsNeeded(p) && p.components.length > 0) return 'ready';
  if (owned > 0) return 'partial';
  return 'missing';
}

/** Total de copias de una reliquia en tu inventario (todas las refinaciones). */
export function relicOwned(progress: Progress, relicKey: string): number {
  const states = progress.relics[relicKey];
  if (!states) return 0;
  return Object.values(states).reduce((n, v) => n + (v ?? 0), 0);
}

/**
 * Cómo puedes conseguir HOY lo que te falta de un prime. No son estados
 * excluyentes: un prime vaulteado del que guardas reliquias es farmeable para
 * ti aunque DE lo haya sacado de las tablas, así que `farmableNow` y
 * `hasRelics` se solapan a propósito.
 */
export interface Acquisition {
  /** alguna reliquia activa hoy suelta una pieza que te falta */
  farmableNow: boolean;
  /** tienes en inventario reliquias que sueltan piezas pendientes (activas o no) */
  hasRelics: boolean;
  /** queda algo pendiente y no hay reliquia activa ni tuya: trading / Varzia */
  tradeOnly: boolean;
}

/** Ojo: solo mira las piezas PENDIENTES. Un prime ya completo no es
 *  "farmeable" por mucho que sus reliquias sigan cayendo, y acumular sus
 *  reliquias no debería encenderle el filtro de inventario. */
export function acquisition(p: Prime, progress: Progress): Acquisition {
  // Construido o masterizado: al craftearlo las piezas se CONSUMEN, así que
  // el inventario "ve" piezas faltantes en un prime que ya está en tu
  // arsenal. Sin este corte contaba como farmeable/tradeable — no hay nada
  // que conseguir de él.
  if (progress.built[p.name] || progress.mastered[p.name]) {
    return { farmableNow: false, hasRelics: false, tradeOnly: false };
  }

  let farmableNow = false;
  let hasRelics = false;
  let pending = false;

  for (const c of p.components) {
    if (c.count - Math.min(progress.parts[c.fullName] ?? 0, c.count) <= 0) continue;
    pending = true;
    for (const r of c.relics) {
      if (r.active) farmableNow = true;
      if (relicOwned(progress, r.relic) > 0) hasRelics = true;
    }
  }

  return { farmableNow, hasRelics, tradeOnly: pending && !farmableNow && !hasRelics };
}

export interface FarmTarget {
  prime: Prime;
  component: PrimeComponent;
  missing: number;
  relic: RelicRef;
  /** copias de esa reliquia que ya tienes */
  owned: number;
  source?: RelicSource;
}

/** Missing parts that can be farmed right now, best odds first.
 *  Las piezas cuya reliquia ya tienes en inventario van primero. */
export function farmTargets(progress: Progress): FarmTarget[] {
  const out: FarmTarget[] = [];
  for (const p of PRIMES) {
    if (p.founders || progress.mastered[p.name] || progress.built[p.name]) continue;
    for (const c of p.components) {
      const missing = c.count - Math.min(progress.parts[c.fullName] ?? 0, c.count);
      if (missing <= 0) continue;
      // preferir una reliquia activa; si no hay, una que ya tengas en inventario
      const relic = c.relics.find((r) => r.active) ?? c.relics.find((r) => relicOwned(progress, r.relic) > 0);
      if (!relic) continue;
      out.push({
        prime: p, component: c, missing, relic,
        owned: relicOwned(progress, relic.relic),
        source: relicSources(relic.relic)[0],
      });
    }
  }
  out.sort(
    (a, b) =>
      Number(b.owned > 0) - Number(a.owned > 0) ||
      (b.relic.chances.Radiant ?? 0) - (a.relic.chances.Radiant ?? 0),
  );
  return out;
}

export interface PrimeTally {
  total: number;
  mastered: number;
  built: number;
  ready: number;
  partial: number;
  missing: number;
  partsOwned: number;
  partsTotal: number;
}

export function tally(progress: Progress, includeFounders = false): PrimeTally {
  const t: PrimeTally = { total: 0, mastered: 0, built: 0, ready: 0, partial: 0, missing: 0, partsOwned: 0, partsTotal: 0 };
  for (const p of PRIMES) {
    if (p.founders && !includeFounders) continue;
    t.total++;
    t[primeStatus(p, progress)]++;
    t.partsOwned += ownedParts(p, progress);
    t.partsTotal += partsNeeded(p);
  }
  return t;
}

/* ═══════════════════════════════════════════════════════════════
   El panel en orden de esfuerzo: abrir lo que ya tienes, farmear lo
   que falta, construir lo que ya se puede.
   ═══════════════════════════════════════════════════════════════ */

/** Toda pieza que aún te falta, con el prime al que pertenece. */
interface MissingPart {
  prime: Prime;
  component: PrimeComponent;
  missing: number;
}

function missingParts(progress: Progress): MissingPart[] {
  const out: MissingPart[] = [];
  for (const p of PRIMES) {
    if (p.founders || progress.mastered[p.name] || progress.built[p.name]) continue;
    for (const c of p.components) {
      const missing = c.count - Math.min(progress.parts[c.fullName] ?? 0, c.count);
      if (missing > 0) out.push({ prime: p, component: c, missing });
    }
  }
  return out;
}

export interface RelicYield {
  prime: Prime;
  component: PrimeComponent;
  ref: RelicRef;
}

export interface OpenableRelic {
  relic: string;
  /** copias por refinación, tal como vino del import */
  states: Partial<Record<Refinement, number>>;
  owned: number;
  /** piezas pendientes que esta reliquia puede dar */
  yields: RelicYield[];
  /** mejor probabilidad radiante entre esas piezas */
  bestChance: number;
}

/** Reliquias que YA tienes y contienen piezas que aún te faltan.
 *  Es lo primero que deberías hacer: no requiere farmear nada. */
export function openableRelics(progress: Progress): OpenableRelic[] {
  const owned = new Map<string, number>();
  for (const [relic, states] of Object.entries(progress.relics)) {
    const n = Object.values(states).reduce((a, v) => a + (v ?? 0), 0);
    if (n > 0) owned.set(relic, n);
  }
  if (owned.size === 0) return [];

  const byRelic = new Map<string, RelicYield[]>();
  for (const { prime, component } of missingParts(progress)) {
    for (const ref of component.relics) {
      if (!owned.has(ref.relic)) continue;
      if (!byRelic.has(ref.relic)) byRelic.set(ref.relic, []);
      byRelic.get(ref.relic)!.push({ prime, component, ref });
    }
  }

  const out: OpenableRelic[] = [];
  for (const [relic, yields] of byRelic) {
    yields.sort((a, b) => (b.ref.chances.Radiant ?? 0) - (a.ref.chances.Radiant ?? 0));
    out.push({
      relic,
      states: progress.relics[relic] ?? {},
      owned: owned.get(relic) ?? 0,
      yields,
      bestChance: yields[0]?.ref.chances.Radiant ?? 0,
    });
  }
  out.sort((a, b) => b.yields.length - a.yields.length || b.bestChance - a.bestChance || b.owned - a.owned);
  return out;
}

export interface MissionRelic {
  relic: string;
  rarity: RelicRef['rarity'];
  owned: number;
  /** piezas pendientes que salen de esta reliquia */
  parts: { primeName: string; label: string }[];
}

export interface FarmMission {
  key: string;
  /** nodos que sirven igual de bien: mismo pool de reliquias y misma rotación */
  wheres: string[];
  mode?: string;
  rot?: string;
  stage?: string;
  /** probabilidad de que caiga UNA reliquia en esa rotación */
  chance: number;
  relics: MissionRelic[];
  /** número de piezas pendientes distintas alcanzables desde aquí */
  covers: number;
}

interface SourceBucket {
  where: string;
  mode?: string;
  rot?: string;
  stage?: string;
  chance: number;
  relics: MissionRelic[];
  parts: Set<string>;
}

/** El mismo farmeo, agrupado por misión en vez de por pieza.
 *  Una entrada dice "ve una vez y te sirven N reliquias", en lugar de
 *  repetir el mismo destino una fila por cada pieza.
 *
 *  Además fusiona los nodos equivalentes: Io, Helene, Camenae y Paimon son
 *  cuatro Defensa Rot A con el mismo pool de Meso, así que van en una sola
 *  fila con los cuatro destinos — si no, la lista repite lo mismo cuatro veces. */
export function farmByMission(progress: Progress): FarmMission[] {
  const bySource = new Map<string, SourceBucket>();

  for (const { prime, component } of missingParts(progress)) {
    for (const ref of component.relics) {
      if (!ref.active) continue;
      for (const src of relicSources(ref.relic)) {
        const key = `${src.where}|${src.mode ?? ''}|${src.rot ?? ''}|${src.stage ?? ''}`;
        let b = bySource.get(key);
        if (!b) {
          b = {
            where: src.where,
            mode: src.mode,
            rot: src.rot,
            stage: src.stage,
            chance: src.chance,
            relics: [],
            parts: new Set(),
          };
          bySource.set(key, b);
        }
        let mr = b.relics.find((r) => r.relic === ref.relic);
        if (!mr) {
          mr = { relic: ref.relic, rarity: ref.rarity, owned: relicOwned(progress, ref.relic), parts: [] };
          b.relics.push(mr);
        }
        const label = `${prime.name} ${component.name}`;
        if (!mr.parts.some((p) => p.label === label)) mr.parts.push({ primeName: prime.name, label });
        b.parts.add(component.fullName);
      }
    }
  }

  // Fusión por pool idéntico: misma rotación, misma probabilidad, mismas reliquias.
  const merged = new Map<string, FarmMission>();
  for (const b of bySource.values()) {
    const pool = b.relics
      .map((r) => r.relic)
      .sort()
      .join(',');
    const sig = `${b.mode ?? ''}|${b.rot ?? ''}|${b.stage ?? ''}|${b.chance}|${pool}`;
    const existing = merged.get(sig);
    if (existing) {
      if (!existing.wheres.includes(b.where)) existing.wheres.push(b.where);
      continue;
    }
    merged.set(sig, {
      key: sig,
      wheres: [b.where],
      mode: b.mode,
      rot: b.rot,
      stage: b.stage,
      chance: b.chance,
      relics: b.relics,
      covers: b.parts.size,
    });
  }

  const out = [...merged.values()];
  for (const m of out) {
    m.relics.sort((a, b) => b.parts.length - a.parts.length || a.relic.localeCompare(b.relic));
    m.wheres.sort((a, b) => a.localeCompare(b));
  }
  out.sort((a, b) => b.covers - a.covers || b.chance - a.chance || b.relics.length - a.relics.length);
  return out;
}

export interface BuildTarget {
  prime: Prime;
  /** XP de maestría que suma al construirlo y subirlo a rango máximo */
  xp: number;
}

/** Primes con todas las piezas en el inventario: mastery esperando en la foundry. */
export function buildReady(progress: Progress): BuildTarget[] {
  const out: BuildTarget[] = [];
  for (const p of PRIMES) {
    if (p.founders) continue;
    if (primeStatus(p, progress) !== 'ready') continue;
    out.push({ prime: p, xp: MASTERY_GEAR.find((g) => g.name === p.name)?.xp ?? 0 });
  }
  out.sort((a, b) => b.xp - a.xp || a.prime.name.localeCompare(b.prime.name));
  return out;
}

/** Texto corto de una fuente de reliquia: "Io (Jupiter) · Defense · Rot A". */
export function sourceLabel(src: RelicSource | undefined): string {
  if (!src) return '—';
  return [src.where, src.mode, src.rot ? `Rot ${src.rot}` : ''].filter(Boolean).join(' · ');
}

/* ═══════════════════════════════════════════════════════════════
   Sección 04 — sube de rango lo que ya tienes.

   Masterizar TODOS los primes del juego da 672.000 XP; MR 30 pide
   2.250.000. El 77% del XP vive en equipo no-prime, y lo más barato de
   todo es el que ya está en tu arsenal sin subir: no hay que farmearlo,
   solo jugarlo. El import de AlecaFrame ya sabe qué tienes.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Consumidores de este ítem que siguen pendientes: mientras quede alguno sin
 * construir ni masterizar, el arma no se debe vender — craftear al consumidor
 * la destruye. En cuanto el consumidor está construido (el ingrediente ya se
 * gastó) o masterizado, la advertencia sobra y desaparece sola.
 */
export function pendingConsumers(item: MasteryItem | undefined, progress: Progress): BuildDep[] {
  return (item?.usedIn ?? []).filter((u) => !progress.built[u.name] && !progress.mastered[u.name]);
}

/** "Akbolto ×2, Hystrix" — texto corto de una lista de dependencias. */
export const depLabel = (deps: BuildDep[]) =>
  deps.map((d) => `${d.name}${d.count > 1 ? ` ×${d.count}` : ''}`).join(', ');

/** Equipo en tu arsenal que aún no llega a rango máximo, lo más jugoso primero. */
export function levelUpQueue(progress: Progress): MasteryItem[] {
  return MASTERY_GEAR.filter(
    (g) => progress.built[g.name] && !progress.mastered[g.name] && !g.founders,
    // Ordenado por lo que todavía puede dar, no por su total: un arma en
    // 28/30 rinde menos que una intacta que valga lo mismo.
  ).sort((a, b) => pendingXp(b, progress) - pendingXp(a, progress) || a.name.localeCompare(b.name));
}

/**
 * Cuándo fue la última sincronización con AlecaFrame, si la hubo.
 *
 * Casi todo el panel se deriva de ese archivo, así que sin este dato no hay
 * forma de saber cuánto desconfiar de lo que muestra. Sale del registro; el
 * `fallback` cubre los eventos guardados antes de que 'sync' fuera su propio
 * tipo, cuando compartía 'import' con la restauración de respaldos.
 */
export function lastSync(progress: Progress): string | undefined {
  for (let i = progress.history.length - 1; i >= 0; i--) {
    const e = progress.history[i];
    if (e.kind === 'sync') return e.t;
    if (e.kind === 'import' && e.label.startsWith('Import AlecaFrame')) return e.t;
  }
  return undefined;
}

/** Cuánto se queda a la vista una fila recién marcada, antes de salir. */
export const LEVELLED_GRACE_MS = 10 * 60 * 1000;

/**
 * Lo que marcaste como masterizado hace poco, con el instante en que cada uno
 * deja de mostrarse. Se deriva del registro, que ya lleva la fecha de cada
 * evento: no hace falta guardar estado extra y sobrevive a recargar la página.
 *
 * La ventana es corta a propósito. Sirve para deshacer un clic accidental, no
 * para llevar la cuenta del día: pasada la gracia la fila estorba, porque lo
 * que importa de la sección 04 es lo que aún está pendiente.
 */
export function masteredRecently(
  progress: Progress,
  now = Date.now(),
  graceMs = LEVELLED_GRACE_MS,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of progress.history) {
    if (!e.item) continue;
    if (e.kind === 'mastered') out.set(e.item, new Date(e.t).getTime() + graceMs);
    else if (e.kind === 'unmastered') out.delete(e.item);
  }
  for (const [name, expiresAt] of out) if (expiresAt <= now) out.delete(name);
  return out;
}

/* ═══════════════════════════════════════════════════════════════
   Sección 00 — lo que estás buscando ahora.
   Nadie caza 161 primes a la vez: marcas dos o tres y el panel te
   arma la ruta completa solo para esos.
   ═══════════════════════════════════════════════════════════════ */

export interface HuntStep {
  component: PrimeComponent;
  missing: number;
  /** la mejor reliquia para esta pieza: primero una que ya tengas */
  ref?: RelicRef;
  /** copias en tu inventario de esa reliquia */
  owned: number;
  source?: RelicSource;
  /** ninguna reliquia activa la da: está en el vault */
  vaulted: boolean;
}

export interface Hunt {
  prime: Prime;
  status: PrimeStatus;
  owned: number;
  total: number;
  xp: number;
  /** solo las piezas que aún faltan */
  steps: HuntStep[];
  /** reliquias tuyas que ya cubren algo pendiente */
  usableRelics: string[];
  /** piezas pendientes sin ninguna reliquia activa: no se farmean, se cambian */
  vaultedSteps: number;
}

/** Elige la reliquia a recomendar para una pieza: primero una que ya tengas
 *  y siga activa, si no la activa con mejor probabilidad radiante. */
function bestRef(component: PrimeComponent, progress: Progress): RelicRef | undefined {
  const active = component.relics.filter((r) => r.active);
  const mine = active
    .filter((r) => relicOwned(progress, r.relic) > 0)
    .sort((a, b) => (b.chances.Radiant ?? 0) - (a.chances.Radiant ?? 0));
  if (mine.length > 0) return mine[0];
  const best = [...active].sort((a, b) => (b.chances.Radiant ?? 0) - (a.chances.Radiant ?? 0));
  return best[0];
}

export function huntList(progress: Progress): Hunt[] {
  const out: Hunt[] = [];
  for (const p of PRIMES) {
    if (!progress.targets[p.name]) continue;
    const status = primeStatus(p, progress);
    const steps: HuntStep[] = [];
    const usable = new Set<string>();

    for (const c of p.components) {
      const missing = c.count - Math.min(progress.parts[c.fullName] ?? 0, c.count);
      if (missing <= 0) continue;
      const ref = bestRef(c, progress);
      const owned = ref ? relicOwned(progress, ref.relic) : 0;
      if (ref?.active && owned > 0) usable.add(ref.relic);
      steps.push({
        component: c,
        missing,
        ref,
        owned,
        source: ref ? relicSources(ref.relic)[0] : undefined,
        vaulted: !ref,
      });
    }

    out.push({
      prime: p,
      status,
      owned: ownedParts(p, progress),
      total: partsNeeded(p),
      xp: MASTERY_GEAR.find((g) => g.name === p.name)?.xp ?? 0,
      steps,
      usableRelics: [...usable],
      vaultedSteps: steps.filter((s) => s.vaulted).length,
    });
  }

  // Lo accionable arriba: construir ya > cerca de terminar > sin empezar >
  // masterizado (que solo sigue ahí porque no lo has quitado de la lista).
  const rank: Record<PrimeStatus, number> = { ready: 0, built: 1, partial: 2, missing: 3, mastered: 4 };
  out.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      b.owned / Math.max(1, b.total) - a.owned / Math.max(1, a.total) ||
      a.prime.name.localeCompare(b.prime.name),
  );
  return out;
}

/* ═══════════════════════════════════════════════════════════════
   Tu próxima sesión — la escalera resuelta en una frase.

   El panel ya calcula los cuatro rankings (abrir, farmear, construir,
   subir); lo que no hacía era elegir. Aquí se elige: la primera opción de la
   escalera que tenga algo, salvo que alguna sirva a un prime que estás
   siguiendo — entonces esa gana, porque nadie caza 161 primes a la vez.
   ═══════════════════════════════════════════════════════════════ */

export type SessionKind = 'open' | 'farm' | 'build' | 'level';

export interface SessionRec {
  kind: SessionKind;
  /** «Abre las 5 Lith P5 que ya tienes» */
  title: string;
  /** el porqué, en una línea */
  why: string;
  /** costo aproximado y grueso; «~25 min» no es una promesa */
  effort: string;
  /** lo que rinde: «+6.000 XP», «4 piezas» */
  value: string;
  /** prime al que abrir el cajón, si hay uno claro */
  primeName?: string;
  /** sirve a uno de tus objetivos marcados */
  forTarget: boolean;
}

export interface Session {
  primary: SessionRec;
  alternatives: SessionRec[];
}

/** «Nidus, Zephyr y Gara» · «Nidus, Zephyr y 4 más» */
function listNames(names: string[], max = 3): string {
  if (names.length <= 1) return names.join('');
  if (names.length <= max) return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
  return `${names.slice(0, max).join(', ')} y ${names.length - max} más`;
}

export function nextSession(progress: Progress): Session | null {
  const targets = new Set(Object.keys(progress.targets).filter((k) => progress.targets[k]));
  const recs: SessionRec[] = [];

  const openable = openableRelics(progress);
  if (openable.length > 0) {
    const forT = openable.find((r) => r.yields.some((y) => targets.has(y.prime.name)));
    const o = forT ?? openable[0];
    const primes = [...new Set(o.yields.map((y) => y.prime.name))];
    // «cierra» = a ese prime le falta exactamente esta pieza
    const closes = [...new Set(
      o.yields
        .filter((y) => partsNeeded(y.prime) - ownedParts(y.prime, progress) === 1)
        .map((y) => y.prime.name),
    )];
    const n = o.yields.length;
    recs.push({
      kind: 'open',
      title: `Abre ${o.owned === 1 ? 'la' : `las ${o.owned}`} ${o.relic} que ya tienes`,
      why:
        (closes.length > 0 ? `Cierra${closes.length > 1 ? 'n' : ''} ${listNames(closes, 2)} · ` : '') +
        `${n} pieza${n === 1 ? '' : 's'} pendiente${n === 1 ? '' : 's'} de ${listNames(primes, 2)} — no hay que farmear nada`,
      effort: `~${Math.min(60, o.owned * 5)} min`,
      value: `${n} pieza${n === 1 ? '' : 's'} · ${o.bestChance.toFixed(1)}% rad.`,
      primeName: closes[0] ?? primes[0],
      forTarget: !!forT,
    });
  }

  const missions = farmByMission(progress);
  if (missions.length > 0) {
    const forT = missions.find((m) => m.relics.some((r) => r.parts.some((p) => targets.has(p.primeName))));
    const m = forT ?? missions[0];
    const where = [m.mode, m.rot ? `Rot ${m.rot}` : ''].filter(Boolean).join(' · ');
    recs.push({
      kind: 'farm',
      title: `Ve a ${m.wheres[0]}`,
      why: `${where} — te sirven ${m.relics.length} reliquias y cubren ${m.covers} piezas pendientes`,
      effort: '~20 min',
      value: `${m.chance.toFixed(1)}% por rotación`,
      forTarget: !!forT,
    });
  }

  const builds = buildReady(progress);
  if (builds.length > 0) {
    const xp = builds.reduce((s, b) => s + b.xp, 0);
    recs.push({
      kind: 'build',
      title: `Construye ${listNames(builds.map((b) => b.prime.name))}`,
      why: 'ya tienes todas las piezas — es maestría esperando en la foundry',
      effort: 'sin jugar',
      value: `+${fmt(xp)} XP`,
      primeName: builds[0].prime.name,
      forTarget: builds.some((b) => targets.has(b.prime.name)),
    });
  }

  const level = levelUpQueue(progress);
  if (level.length > 0) {
    const g = level[0];
    const rank = Math.min(progress.ranks[g.name] ?? 0, g.cap);
    recs.push({
      kind: 'level',
      title: `Sube ${g.name} a rango ${g.cap}`,
      why: rank > 0 ? `está en tu arsenal en rango ${rank}/${g.cap} — solo hay que jugarlo` : 'está en tu arsenal sin subir — solo hay que jugarlo',
      effort: '~30 min',
      value: `+${fmt(pendingXp(g, progress))} XP`,
      forTarget: false,
    });
  }

  if (recs.length === 0) return null;
  const i = Math.max(0, recs.findIndex((r) => r.forTarget));
  return { primary: recs[i], alternatives: recs.filter((_, k) => k !== i) };
}
