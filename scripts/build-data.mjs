/**
 * build-data.mjs — regenerates src/data/game-data.json
 *
 * Sources:
 *  - @wfcd/items (npm): prime items, components, relic reward tables
 *  - drops.warframestat.us/data/all.json: live drop tables (which relics
 *    are farmable right now, and where)
 *
 * Run after every Warframe patch: `pnpm build:data`
 */
import Items from '@wfcd/items';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../src/data/game-data.json');
const DROP_URL = 'https://drops.warframestat.us/data/all.json';
const GEAR_CATEGORIES = ['Warframes', 'Primary', 'Secondary', 'Melee', 'Sentinels', 'Pets', 'Arch-Gun', 'Arch-Melee', 'Archwing', 'Misc'];
const FOUNDERS = new Set(['Excalibur Prime', 'Lato Prime', 'Skana Prime']);

// ---------------------------------------------------------------- relics
// Map 'Axi A17' -> { rewards: Map<itemName, { rarity, chances: {Intact,...} }> }
// @wfcd/items etiqueta los 3 slots Common como 'Uncommon' (el campo rarity viene
// mal upstream), pero la probabilidad sí es correcta: derivamos la rareza de ahí.
// Tabla oficial por refinamiento — Flawless/Common y Radiant/Uncommon comparten
// el 20%, por eso no sirve un umbral global sobre chance.
const RARITY_BY_REFINEMENT = {
  Intact: [[25.33, 'Common'], [11, 'Uncommon'], [2, 'Rare']],
  Exceptional: [[23.33, 'Common'], [13, 'Uncommon'], [4, 'Rare']],
  Flawless: [[20, 'Common'], [17, 'Uncommon'], [6, 'Rare']],
  Radiant: [[16.67, 'Common'], [20, 'Uncommon'], [10, 'Rare']],
};
const rarityOf = (refinement, chance) =>
  RARITY_BY_REFINEMENT[refinement]?.find(([c]) => Math.abs(c - chance) < 0.4)?.[1] ?? null;

const relicItems = new Items({ category: ['Relics'] });
const relicMap = new Map();
for (const r of relicItems) {
  const m = /^(Lith|Meso|Neo|Axi|Requiem) (\S+) (Intact|Exceptional|Flawless|Radiant)$/.exec(r.name);
  if (!m) continue;
  const key = `${m[1]} ${m[2]}`;
  let entry = relicMap.get(key);
  if (!entry) relicMap.set(key, (entry = { tier: m[1], rewards: new Map() }));
  for (const rw of r.rewards ?? []) {
    let rec = entry.rewards.get(rw.item.name);
    if (!rec) entry.rewards.set(rw.item.name, (rec = { rarity: rw.rarity, chances: {} }));
    rec.chances[m[3]] = rw.chance;
    const derived = rarityOf(m[3], rw.chance);
    if (derived) rec.rarity = derived;
  }
}

// Reverse index: reward item name -> [{ relic, rarity, chances }]
const rewardIndex = new Map();
for (const [relic, entry] of relicMap) {
  for (const [itemName, rec] of entry.rewards) {
    if (!rewardIndex.has(itemName)) rewardIndex.set(itemName, []);
    rewardIndex.get(itemName).push({ relic, rarity: rec.rarity, chances: rec.chances });
  }
}

// ---------------------------------------------------------------- drop tables
console.log('Fetching live drop tables...');
const dropData = await (await fetch(DROP_URL)).json();

// relicSources: 'Axi A17' -> [{ where, mode?, rot?, stage?, chance }]
const relicSources = new Map();
function addSource(itemName, source) {
  const m = /^(Lith|Meso|Neo|Axi|Requiem) (\S+) Relic/.exec(itemName ?? '');
  if (!m) return;
  const key = `${m[1]} ${m[2]}`;
  if (!relicSources.has(key)) relicSources.set(key, []);
  relicSources.get(key).push(source);
}

// 1. Star chart / open worlds / railjack missions
for (const [planet, nodes] of Object.entries(dropData.missionRewards)) {
  for (const [node, info] of Object.entries(nodes)) {
    const rots = Array.isArray(info.rewards) ? { '': info.rewards } : info.rewards ?? {};
    for (const [rot, rewards] of Object.entries(rots)) {
      for (const rw of rewards) {
        addSource(rw.itemName, { where: `${node} (${planet})`, mode: info.gameMode, rot: rot || undefined, chance: rw.chance });
      }
    }
  }
}

// 2. Bounties (Cetus, Fortuna, Deimos, Zariman, Sanctum, Hex)
const BOUNTY_TABLES = [
  ['cetusBountyRewards', 'Cetus'],
  ['solarisBountyRewards', 'Fortuna'],
  ['deimosRewards', 'Deimos'],
  ['zarimanRewards', 'Zariman'],
  ['entratiLabRewards', 'Sanctum Anatomica'],
  ['hexRewards', 'Hollvania'],
];
for (const [tableKey, hub] of BOUNTY_TABLES) {
  for (const bounty of dropData[tableKey] ?? []) {
    for (const [rot, rewards] of Object.entries(bounty.rewards ?? {})) {
      for (const rw of rewards) {
        addSource(rw.itemName, {
          where: `${bounty.bountyLevel} (${hub})`, mode: 'Bounty', rot: rot || undefined,
          stage: rw.stage, chance: rw.chance,
        });
      }
    }
  }
}

// 3. Transient objectives (Railjack caches, events, etc.)
for (const obj of dropData.transientRewards ?? []) {
  for (const rw of obj.rewards ?? []) {
    addSource(rw.itemName, { where: obj.objectiveName, rot: rw.rotation || undefined, chance: rw.chance });
  }
}

// Keep the best sources per relic (highest chance first, cap 8)
for (const [key, sources] of relicSources) {
  sources.sort((a, b) => b.chance - a.chance);
  relicSources.set(key, sources.slice(0, 8));
}

// ---------------------------------------------------------------- primes
// El filtro `{ category }` de @wfcd/items no devuelve los 'Companion Weapon'
// (24 armas de centinela masterizables) pese a que su category ES 'Primary'.
// Filtrando en JS sobre el set completo aparecen: 803 masterizables, no 779.
const gear = [...new Items({})].filter((i) => GEAR_CATEGORIES.includes(i.category));
const primes = [];
for (const item of gear) {
  if (!item.isPrime || !item.masterable) continue;
  const components = [];
  for (const comp of item.components ?? []) {
    // A prime part matches a relic reward by its full name
    const candidates = [
      `${item.name} ${comp.name}`,
      `${item.name} ${comp.name} Blueprint`,
      comp.name === 'Blueprint' ? `${item.name} Blueprint` : null,
    ].filter(Boolean);
    const match = candidates.find((n) => rewardIndex.has(n));
    if (!match) continue; // resources / non-relic components
    const relics = rewardIndex.get(match).map((r) => ({
      relic: r.relic, rarity: r.rarity, chances: r.chances,
      active: relicSources.has(r.relic),
    }));
    relics.sort((a, b) => Number(b.active) - Number(a.active) || b.chances.Radiant - a.chances.Radiant);
    components.push({
      name: comp.name,
      fullName: match,
      un: comp.uniqueName,
      count: comp.itemCount ?? 1,
      ducats: comp.ducats,
      market: match.toLowerCase().replace(/ /g, '_').replace(/&/g, 'and'),
      relics,
    });
  }
  if (!components.length && !FOUNDERS.has(item.name)) {
    console.warn(`  ! no relic components matched for ${item.name}`);
  }
  primes.push({
    name: item.name,
    un: item.uniqueName,
    category: item.category,
    releaseDate: item.releaseDate,
    image: item.imageName,
    wikiaThumbnail: item.wikiaThumbnail,
    founders: FOUNDERS.has(item.name) || undefined,
    farmable: components.some((c) => c.relics.some((r) => r.active)) || undefined,
    components,
  });
}
primes.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '') || a.name.localeCompare(b.name));

// ---------------------------------------------------------------- mastery catalog
const FRAME_LIKE = new Set(['Warframes', 'Archwing', 'Pets', 'Sentinels', 'Misc']);
const masteryGear = [];
const miscCats = {};
for (const item of gear) {
  if (!item.masterable) continue;
  if (item.category === 'Misc') miscCats[item.type ?? 'unknown'] = (miscCats[item.type ?? 'unknown'] || 0) + 1;
  const cap = item.maxLevelCap ?? 30;
  // Kitgun chambers rank like weapons despite living in Misc
  const frameLike = FRAME_LIKE.has(item.category) && item.type !== 'Kitgun Component';
  const perLevel = frameLike ? 200 : 100;
  masteryGear.push({
    name: item.name,
    un: item.uniqueName,
    category: item.category,
    type: item.type,
    isPrime: item.isPrime || undefined,
    // el mismo CDN que los primes; si el archivo no existe (Carrier) la vista cae al glifo
    image: item.imageName,
    cap,
    xp: cap * perLevel,
    // total affinity at rank cap — used to detect "mastered" from XPInfo
    aff: cap * cap * (frameLike ? 1000 : 500),
    founders: FOUNDERS.has(item.name) || undefined,
  });
}
masteryGear.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
console.log('masterable Misc types:', JSON.stringify(miscCats));

// ---------------------------------------------------------------- build deps
// Armas que se consumen al craftear otras (Bolto ×2 → Akbolto, Broken War →
// War): el catálogo las trae como components cuyo uniqueName es otro ítem
// masterizable. Los duplicados suman — Akbronco Prime lista "Bronco Prime x1"
// dos veces porque necesita 2.
const gearByUn = new Map(masteryGear.map((g) => [g.un, g]));
const gearByName = new Map(masteryGear.map((g) => [g.name, g]));
for (const item of gear) {
  if (!item.masterable) continue;
  const consumer = gearByName.get(item.name);
  if (!consumer) continue;
  const counts = new Map();
  for (const comp of item.components ?? []) {
    const ing = gearByUn.get(comp.uniqueName);
    if (ing && ing.name !== item.name) counts.set(ing.name, (counts.get(ing.name) ?? 0) + (comp.itemCount ?? 1));
  }
  for (const [name, count] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
    (consumer.needs ??= []).push({ name, count });
    (gearByName.get(name).usedIn ??= []).push({ name: item.name, count });
  }
}
for (const g of masteryGear) g.usedIn?.sort((a, b) => a.name.localeCompare(b.name));
console.log(
  'build deps:',
  masteryGear.filter((g) => g.usedIn).length, 'ingredientes →',
  masteryGear.filter((g) => g.needs).length, 'consumidores',
);

// ---------------------------------------------------------------- piezas, recursos y adquisición
// Lo que hace falta para craftear cada ítem, en dos listas distintas porque
// se tratan distinto:
//  - `parts`: blueprint y partes con nombre (Chassis, Barrel…) — se rastrean
//    una a una desde el inventario, igual que las piezas prime. Solo para
//    no-prime: las de los primes ya viven en `primes[].components`.
//  - `resources`: Alloy Plate, Forma, Orokin Cell… — solo interesan como
//    déficit («te faltan 7 Fieldron»), así que van por nombre y cantidad y el
//    uniqueName sale a `resourceIndex`, una vez por recurso y no 1.500 veces.
// Un ingrediente masterizable (Bolto → Akbolto) ya está en `needs` y no se
// repite aquí. La clase se decide por el uniqueName: todo lo que cuelga de
// /Lotus/Types/Recipes/ es pieza, y «Blueprint» lo es aunque viva bajo
// /Lotus/Weapons/ (ClanTech, Ostron, SolarisUnited).
//
// La adquisición del blueprint va tal como la trae el catálogo, sin
// interpretarla: `credits` es lo que cuesta el blueprint (mercado o dojo, el
// dato no distingue — Tenora y Karyst traen el mismo campo y uno es Tenno Lab),
// `plat` el precio del arma hecha en el mercado, `drops` de dónde cae el
// ítem entero cuando no tiene blueprint (Kuva/Tenet, algunos de sindicato).
const isPartUn = (un) => /^\/Lotus\/Types\/Recipes\//.test(un ?? '');
const topDrops = (drops) => {
  const seen = new Set();
  const out = [];
  for (const d of [...(drops ?? [])].sort((a, b) => b.chance - a.chance)) {
    if (!d.location || seen.has(d.location)) continue;
    seen.add(d.location);
    out.push({ where: d.location, chance: d.chance });
    if (out.length >= 3) break;
  }
  return out.length ? out : undefined;
};
const resourceIndex = {};
let withParts = 0;
let withResources = 0;
for (const item of gear) {
  if (!item.masterable) continue;
  const g = gearByName.get(item.name);
  if (!g) continue;
  const parts = [];
  const resources = [];
  for (const comp of item.components ?? []) {
    if (gearByUn.has(comp.uniqueName)) continue; // ingrediente masterizable: ya está en `needs`
    const count = comp.itemCount ?? 1;
    if (comp.name === 'Blueprint' || isPartUn(comp.uniqueName)) {
      if (item.isPrime) continue; // las piezas prime ya están en primes[].components
      parts.push({ name: comp.name, un: comp.uniqueName, count, drops: topDrops(comp.drops) });
    } else {
      resources.push({ name: comp.name, count });
      if (comp.uniqueName) resourceIndex[comp.name] ??= comp.uniqueName;
    }
  }
  if (parts.length) {
    // blueprint primero, luego las partes por nombre: es el orden en que se consiguen
    parts.sort((a, b) => Number(b.name === 'Blueprint') - Number(a.name === 'Blueprint') || a.name.localeCompare(b.name));
    g.parts = parts;
    withParts++;
  }
  if (resources.length) {
    resources.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    g.resources = resources;
    withResources++;
  }
  if (item.masteryReq) g.mr = item.masteryReq;
  if (item.marketCost) g.plat = item.marketCost;
  if (item.bpCost) g.credits = item.bpCost;
  const drops = topDrops(item.drops);
  if (drops) g.drops = drops;
}
console.log(
  'crafteo:', withParts, 'ítems con piezas,', withResources, 'con recursos,',
  Object.keys(resourceIndex).length, 'recursos distintos',
);

// ---------------------------------------------------------------- relic index
// uniqueName (sin prefijo) -> "Lith S1 Intact" — para leer el inventario de
// reliquias importado de AlecaFrame (MiscItems /Lotus/Types/Game/Projections/…)
const PROJ_PREFIX = '/Lotus/Types/Game/Projections/';
const relicIndex = {};
for (const r of relicItems) {
  if (r.uniqueName?.startsWith(PROJ_PREFIX) && /(Intact|Exceptional|Flawless|Radiant)$/.test(r.name)) {
    relicIndex[r.uniqueName.slice(PROJ_PREFIX.length)] = r.name;
  }
}

// ---------------------------------------------------------------- star chart nodes
// Mission tags (SolNode…/SettlementNode…) — used to estimate star chart
// mastery XP from an imported inventory's Missions list.
const nodeItems = new Items({ category: ['Node'] });
const starChartNodes = [...new Set(nodeItems.map((n) => n.uniqueName).filter(Boolean))];

// ---------------------------------------------------------------- write
const out = {
  builtAt: new Date().toISOString(),
  primes,
  relicSources: Object.fromEntries(relicSources),
  masteryGear,
  starChartNodes,
  relicIndex,
  resourceIndex,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`OK ${primes.length} primes | ${relicSources.size} active relics | ${masteryGear.length} masterable items`);
console.log(`OK wrote ${OUT} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`);
