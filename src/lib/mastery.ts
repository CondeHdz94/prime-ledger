import type { Extras, Progress } from '../types';
import { MASTERY_GEAR } from './gameData';

/** XP needed to *reach* MR `rank` (0–30). Legendary: 2.25M + 147.5K per LR. */
export const mrThreshold = (rank: number) =>
  rank <= 30 ? 2500 * rank * rank : 2_250_000 + 147_500 * (rank - 30);

export const MR30_XP = mrThreshold(30); // 2,250,000

export const EXTRAS_XP: Record<keyof Extras, { per: number; max: number; label: string; hint: string }> = {
  junctions: { per: 1000, max: 14, label: 'Junctions', hint: '1.000 XP c/u' },
  junctionsSP: { per: 1000, max: 14, label: 'Junctions (Steel Path)', hint: '1.000 XP c/u' },
  railjack: { per: 1500, max: 50, label: 'Intrínsecos Railjack', hint: '1.500 XP por rango (5 árboles × 10)' },
  drifter: { per: 1500, max: 40, label: 'Intrínsecos Drifter', hint: '1.500 XP por rango (4 árboles × 10)' },
  starChart: { per: 1, max: 27519, label: 'Star Chart (XP)', hint: 'nodos mapa normal, máx ≈ 27.519' },
  starChartSP: { per: 1, max: 27519, label: 'Steel Path (XP)', hint: 'nodos SP, máx 27.519' },
};

export function extrasXp(extras: Extras): number {
  return (Object.keys(EXTRAS_XP) as (keyof Extras)[]).reduce(
    (sum, k) => sum + Math.min(extras[k] ?? 0, EXTRAS_XP[k].max) * EXTRAS_XP[k].per,
    0,
  );
}

export function gearXp(progress: Progress): number {
  let sum = 0;
  for (const item of MASTERY_GEAR) if (progress.mastered[item.name]) sum += item.xp;
  return sum;
}

export function totalXp(progress: Progress): number {
  return gearXp(progress) + extrasXp(progress.extras);
}

/** Current MR for a given XP total. */
export function mrFromXp(xp: number): number {
  let rank = 0;
  while (rank < 30 && xp >= mrThreshold(rank + 1)) rank++;
  if (rank === 30) while (xp >= mrThreshold(rank + 1)) rank++;
  return rank;
}

/** Etiqueta del rango tal como la nombra el juego: MR 31 es "Legendary 1". */
export const mrLabel = (rank: number) => (rank > 30 ? `Legendary ${rank - 30}` : `MR ${rank}`);

/** El objetivo que persigue el panel y cuánto falta para él. */
export interface MrGoal {
  mr: number;
  /** rango legendario alcanzado (1, 2, 3…), sólo por encima de MR 30 */
  legendary?: number;
  /** rango que persigue la barra */
  goal: number;
  goalXp: number;
  /** XP que falta para `goal` */
  toGoal: number;
  /** 0–100 hacia `goal` */
  pct: number;
  /** true mientras MR 30 siga siendo la meta */
  chasingMr30: boolean;
}

/**
 * Hasta MR 30 la meta es MR 30: es el techo que le importa a casi todo el
 * mundo, y la barra mide el camino entero desde cero. Pasado ese punto la meta
 * pasa a ser el siguiente rango legendario y la barra mide sólo el tramo del
 * rango actual — si no, se queda clavada en 100 % y deja de decir nada.
 */
export function mrGoal(xp: number): MrGoal {
  const mr = mrFromXp(xp);
  const chasingMr30 = mr < 30;
  const goal = chasingMr30 ? 30 : mr + 1;
  const goalXp = mrThreshold(goal);
  const from = chasingMr30 ? 0 : mrThreshold(mr);
  const span = Math.max(1, goalXp - from);
  return {
    mr,
    legendary: mr > 30 ? mr - 30 : undefined,
    goal,
    goalXp,
    toGoal: Math.max(0, goalXp - xp),
    // Truncado y no redondeado: con 2.249.999 XP (MR 29, falta 1) un
    // toFixed(1) mostraba "100.0 %" y daba la meta por cumplida.
    pct: Math.min(100, Math.floor(((xp - from) / span) * 1000) / 10),
    chasingMr30,
  };
}

/** XP still available from unmastered gear (excluding founders' items). */
export function remainingGearXp(progress: Progress): number {
  let sum = 0;
  for (const item of MASTERY_GEAR) {
    if (!progress.mastered[item.name] && !item.founders) sum += item.xp;
  }
  return sum;
}

export const fmt = (n: number) => n.toLocaleString('es-CO');
