import type { Prime, PrimeComponent, Progress, RelicRef, RelicSource } from '../types';
import { PRIMES, partsNeeded, relicSources } from './gameData';

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
