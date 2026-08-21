import raw from '../data/game-data.json';
import type { GameData, MasteryItem, Prime } from '../types';

export const DATA = raw as unknown as GameData;

/**
 * Relleno para lo que falte en el set masterizable de `@wfcd/items`.
 *
 * Voidrig y Bonewidow vivían aquí, pero aguas arriba ya los añadieron: las
 * copias manuales solo servían para duplicar filas, y encima eran peores —
 * sin `un` ni `aff` el importador jamás podría detectarlas. La deduplicación
 * de abajo hace que este relleno sea inofensivo aunque se quede obsoleto otra
 * vez: lo del catálogo siempre gana.
 */
const MANUAL_MASTERY: MasteryItem[] = [{ name: 'Plexus', category: 'Railjack', cap: 30, xp: 6000 }];

/**
 * Único por nombre, porque el progreso se guarda por nombre: dos entradas
 * homónimas comparten estado y se renderizan como filas gemelas.
 *
 * Hoy solo colisiona "Grimoire" (`TnGrimoire` y `TnDoppelgangerGrimoire`, dos
 * armas distintas con el mismo nombre visible). Se pierde su XP duplicado —
 * 3.000 de 2,9 M — y a cambio la lista deja de mentir. Soportar ambas de
 * verdad exigiría indexar el progreso por `un` en vez de por nombre.
 */
export const MASTERY_GEAR: MasteryItem[] = (() => {
  const byName = new Map<string, MasteryItem>();
  for (const g of [...DATA.masteryGear, ...MANUAL_MASTERY]) {
    if (!byName.has(g.name)) byName.set(g.name, g);
  }
  return [...byName.values()];
})();

export const PRIMES: Prime[] = DATA.primes;

export const CDN_IMG = (image?: string) =>
  image ? `https://cdn.warframestat.us/img/${image}` : undefined;

export const marketUrl = (slug: string) => `https://warframe.market/items/${slug}`;

/**
 * Slug del SET completo: "Styanax Prime" → `styanax_prime_set`, la misma
 * convención con la que `build-data.mjs` arma el slug de cada componente.
 *
 * Solo tienen set en el mercado los primes que salen de reliquias: los de
 * evento (War, Gotva) y los de Founders no son intercambiables y no tienen
 * página. Verificado contra la lista de items de warframe.market: 159 de 164
 * primes calzan, y los 5 que no son exactamente esos.
 */
export const marketSetSlug = (p: Prime): string | undefined =>
  p.components.length > 0 && !p.founders
    ? `${p.name} Set`.toLowerCase().replace(/ /g, '_').replace(/&/g, 'and')
    : undefined;

/** Total parts needed for a prime (sum of component counts). */
export const partsNeeded = (p: Prime) => p.components.reduce((n, c) => n + c.count, 0);

export const relicSources = (relic: string) => DATA.relicSources[relic] ?? [];

/** Human label for the categories used in filters. */
export const CATEGORY_LABEL: Record<string, string> = {
  Warframes: 'Warframes',
  Primary: 'Primarias',
  Secondary: 'Secundarias',
  Melee: 'Melee',
  Sentinels: 'Centinelas',
  Pets: 'Compañeros',
  'Arch-Gun': 'Arch-Gun',
  'Arch-Melee': 'Arch-Melee',
  Archwing: 'Archwing',
  Misc: 'Modular',
  Necramech: 'Necramech',
  Railjack: 'Railjack',
};
