import raw from '../data/game-data.json';
import type { GameData, MasteryItem, Prime } from '../types';

export const DATA = raw as unknown as GameData;

/** Necramechs & Plexus are not in warframe-items' masterable set — added manually. */
const MANUAL_MASTERY: MasteryItem[] = [
  { name: 'Voidrig', category: 'Necramech', cap: 40, xp: 8000 },
  { name: 'Bonewidow', category: 'Necramech', cap: 40, xp: 8000 },
  { name: 'Plexus', category: 'Railjack', cap: 30, xp: 6000 },
];

export const MASTERY_GEAR: MasteryItem[] = [...DATA.masteryGear, ...MANUAL_MASTERY];

export const PRIMES: Prime[] = DATA.primes;

export const CDN_IMG = (image?: string) =>
  image ? `https://cdn.warframestat.us/img/${image}` : undefined;

export const marketUrl = (slug: string) => `https://warframe.market/items/${slug}`;

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
