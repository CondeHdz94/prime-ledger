/**
 * snapshot.mjs — foto (y diff) del catálogo generado.
 *
 * `game-data.json` son ~950 KB en una sola línea: su diff de git es ilegible y
 * un cambio de upstream pasa silencioso. Esto resume lo que importa y compara
 * dos fotos.
 *
 *   node .claude/skills/patch-refresh/snapshot.mjs            > antes.json
 *   node .claude/skills/patch-refresh/snapshot.mjs antes.json   # diff legible
 */
import { readFileSync } from 'node:fs';

const DATA = 'src/data/game-data.json';
const d = JSON.parse(readFileSync(DATA, 'utf8'));

const byCategory = {};
for (const p of d.primes) byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;

// Los mapas de etiquetas se mantienen a mano: una categoría nueva no rompe el
// build, solo sale sin nombre o al final de los filtros.
const src = {
  CATEGORY_LABEL: readFileSync('src/lib/gameData.ts', 'utf8'),
  CAT_ORDER: readFileSync('src/lib/primeFilters.ts', 'utf8'),
};
const unlabeled = Object.keys(byCategory).filter((c) => !src.CATEGORY_LABEL.includes(`'${c}'`) && !src.CATEGORY_LABEL.includes(`\n  ${c}:`));
const unordered = Object.keys(byCategory).filter((c) => !src.CAT_ORDER.includes(`'${c}'`));

const snap = {
  builtAt: d.builtAt,
  counts: {
    primes: d.primes.length,
    catalog: d.primes.filter((p) => !p.founders).length,
    farmable: d.primes.filter((p) => p.farmable).length,
    gear: d.masteryGear.length,
    activeRelics: Object.keys(d.relicSources).length,
    buildDeps: d.masteryGear.filter((g) => g.needs).length,
  },
  byCategory,
  unlabeled,
  unordered,
  primes: d.primes.map((p) => p.name).sort(),
  gear: d.masteryGear.map((g) => g.name).sort(),
  activeRelics: Object.keys(d.relicSources).sort(),
  /** primes sin ninguna reliquia activa: los que la app marca Vault */
  vaulted: d.primes.filter((p) => !p.farmable && !p.founders && p.components.length).map((p) => p.name).sort(),
};

const baseline = process.argv[2];
if (!baseline) {
  console.log(JSON.stringify(snap, null, 2));
  process.exit(0);
}

// ---------------------------------------------------------------- diff
const old = JSON.parse(readFileSync(baseline, 'utf8'));
const diff = (a = [], b = []) => {
  const A = new Set(a), B = new Set(b);
  return { entran: b.filter((x) => !A.has(x)), salen: a.filter((x) => !B.has(x)) };
};
const line = (label, { entran, salen }) => {
  if (!entran.length && !salen.length) return;
  console.log(`\n${label}`);
  if (entran.length) console.log(`  + ${entran.join(', ')}`);
  if (salen.length) console.log(`  − ${salen.join(', ')}`);
};

console.log(`catálogo  ${old.builtAt.slice(0, 10)} → ${snap.builtAt.slice(0, 10)}\n`);
for (const k of Object.keys(snap.counts)) {
  const [a, b] = [old.counts[k], snap.counts[k]];
  const delta = b - a;
  console.log(`  ${k.padEnd(13)} ${String(a).padStart(4)} → ${String(b).padStart(4)}  ${delta ? (delta > 0 ? `+${delta}` : delta) : '='}`);
}
line('primes', diff(old.primes, snap.primes));
line('masterizables', diff(old.gear, snap.gear));
line('reliquias activas', diff(old.activeRelics, snap.activeRelics));
line('primes que entran/salen del Vault', diff(old.vaulted, snap.vaulted));
line('categorías', diff(Object.keys(old.byCategory), Object.keys(snap.byCategory)));

if (snap.unlabeled.length) console.log(`\n⚠ sin etiqueta en CATEGORY_LABEL (gameData.ts): ${snap.unlabeled.join(', ')}`);
if (snap.unordered.length) console.log(`⚠ fuera de CAT_ORDER (primeFilters.ts): ${snap.unordered.join(', ')}`);
