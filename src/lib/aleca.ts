/**
 * Importador de AlecaFrame — descifra `lastData.dat` (%localappdata%/AlecaFrame)
 * y lo convierte en un parche de Progress.
 *
 * El archivo es el JSON de inventario de DE cifrado con AES-128-CBC y una
 * clave estática pública (documentada en Sainan/alecaframe-inventory-parser).
 * Todo ocurre en el navegador: nada sale de tu máquina.
 */
import type { Extras, Progress, Refinement } from '../types';
import { DATA, MASTERY_GEAR, PRIMES } from './gameData';
import { EXTRAS_XP } from './mastery';

const KEY = new TextEncoder().encode('LEO-ALEC\tEO-ALEC');
const IV = new Uint8Array([49, 50, 70, 71, 66, 51, 54, 45, 76, 69, 51, 45, 113, 61, 57, 0]);

interface CountedItem { ItemType: string; ItemCount?: number }
interface XpEntry { ItemType: string; XP: number }
interface MissionEntry { Tag: string; Tier?: number }

interface DeInventory {
  PlayerLevel?: number;
  MiscItems?: CountedItem[];
  Recipes?: CountedItem[];
  XPInfo?: XpEntry[];
  Missions?: MissionEntry[];
  PlayerSkills?: Record<string, number>;
  [key: string]: unknown;
}

export interface AlecaImportResult {
  patch: Pick<Progress, 'parts' | 'built' | 'mastered' | 'relics' | 'ranks'> & { extras: Extras };
  summary: {
    mrInGame?: number;
    partsFound: number;
    primesBuilt: number;
    /** ítems masterizables que ya están en tu arsenal */
    gearOwned: number;
    itemsMastered: number;
    /** ítems a medio subir, que ya aportan XP sin estar al tope */
    itemsPartial: number;
    relicCount: number;
    starChartNodes: number;
    steelPathNodes: number;
  };
}

export async function parseLastData(file: File): Promise<AlecaImportResult> {
  const cipher = await file.arrayBuffer();
  const key = await crypto.subtle.importKey('raw', KEY, 'AES-CBC', false, ['decrypt']);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: IV }, key, cipher);
  } catch {
    throw new Error('No se pudo descifrar: ¿es un lastData.dat de AlecaFrame?');
  }
  let inv = JSON.parse(new TextDecoder().decode(plain)) as DeInventory;
  // Algunas versiones envuelven el inventario en { InventoryJson: "…" }
  if (typeof inv.InventoryJson === 'string') inv = JSON.parse(inv.InventoryJson) as DeInventory;
  if (!inv.XPInfo && !inv.MiscItems) throw new Error('El archivo no contiene un inventario válido');
  return buildPatch(inv);
}

function buildPatch(inv: DeInventory): AlecaImportResult {
  // Índices del inventario --------------------------------------------------
  const counts = new Map<string, number>();
  for (const it of [...(inv.MiscItems ?? []), ...(inv.Recipes ?? [])]) {
    counts.set(it.ItemType, (counts.get(it.ItemType) ?? 0) + (it.ItemCount ?? 1));
  }
  const xpByType = new Map<string, number>();
  for (const e of inv.XPInfo ?? []) xpByType.set(e.ItemType, e.XP);

  // Ítems actualmente en posesión (construidos): arrays de equipo del inventario
  const EQUIPMENT_KEYS = [
    'Suits', 'LongGuns', 'Pistols', 'Melee', 'Sentinels', 'SentinelWeapons',
    'SpaceSuits', 'SpaceGuns', 'SpaceMelee', 'MechSuits', 'KubrowPets',
    'MoaPets', 'DataKnives', 'DrifterMelee', 'Hoverboards', 'OperatorAmps',
  ];
  const ownedTypes = new Set<string>();
  for (const k of EQUIPMENT_KEYS) {
    const v = inv[k];
    if (!Array.isArray(v)) continue;
    for (const entry of v) {
      const t = (entry as CountedItem)?.ItemType;
      if (typeof t === 'string') ownedTypes.add(t);
    }
  }

  // Piezas prime ------------------------------------------------------------
  const parts: Record<string, number> = {};
  let partsFound = 0;
  for (const p of PRIMES) {
    for (const c of p.components) {
      if (!c.un) continue;
      // El blueprint de una parte de warframe vive en Recipes con sufijo
      // "Blueprint"; la parte ya construida vive en MiscItems como "Component".
      // Set: si `un` no termina en Component/Blueprint los tres replace devuelven
      // la misma cadena, y sumarlas contaba la misma pieza 2-3 veces.
      const variants = new Set([
        c.un,
        c.un.replace(/Component$/, 'Blueprint'),
        c.un.replace(/Blueprint$/, 'Component'),
      ]);
      let total = 0;
      for (const v of variants) total += counts.get(v) ?? 0;
      const owned = Math.min(c.count, total);
      if (owned > 0) {
        parts[c.fullName] = owned;
        partsFound += owned;
      }
    }
  }

  // Lo que tienes en el arsenal ---------------------------------------------
  // `built` cubre TODO el equipo masterizable, no solo primes: un arma que ya
  // tienes y no has subido a rango máximo es XP de maestría sin farmear nada,
  // y ahí está el 77% del XP que hace falta para MR 30.
  const built: Record<string, boolean> = {};
  let primesBuilt = 0;
  for (const p of PRIMES) {
    if (p.un && ownedTypes.has(p.un)) {
      built[p.name] = true;
      primesBuilt++;
    }
  }
  for (const g of MASTERY_GEAR) {
    if (g.un && ownedTypes.has(g.un)) built[g.name] = true;
  }
  const gearOwned = Object.keys(built).length;

  const mastered: Record<string, boolean> = {};
  const ranks: Record<string, number> = {};
  let itemsMastered = 0;
  let itemsPartial = 0;
  for (const g of MASTERY_GEAR) {
    if (!g.un || !g.aff) continue;
    const xp = xpByType.get(g.un);
    if (xp === undefined) continue;
    if (xp >= g.aff) {
      mastered[g.name] = true;
      itemsMastered++;
      continue;
    }
    // La afinidad para el rango n es k·n², y k sale del propio catálogo:
    // aff es la del rango tope, o sea k·cap². Invertir eso da el rango actual
    // sin duplicar aquí la tabla de 500/1000 por categoría.
    const k = g.aff / (g.cap * g.cap);
    const rank = Math.min(g.cap, Math.floor(Math.sqrt(xp / k)));
    if (rank > 0) {
      ranks[g.name] = rank;
      itemsPartial++;
    }
  }

  // Inventario de reliquias -------------------------------------------------
  const PROJ_PREFIX = '/Lotus/Types/Game/Projections/';
  const relics: Progress['relics'] = {};
  let relicCount = 0;
  for (const it of inv.MiscItems ?? []) {
    if (!it.ItemType.startsWith(PROJ_PREFIX)) continue;
    const display = DATA.relicIndex[it.ItemType.slice(PROJ_PREFIX.length)];
    if (!display) continue; // requiem u otros sin mapeo de estado
    const m = /^(.+) (Intact|Exceptional|Flawless|Radiant)$/.exec(display);
    if (!m) continue;
    const [, relicKey, state] = m;
    (relics[relicKey] ??= {})[state as Refinement] =
      ((relics[relicKey]?.[state as Refinement]) ?? 0) + (it.ItemCount ?? 1);
    relicCount += it.ItemCount ?? 1;
  }

  // Star chart, junctions e intrínsecos -------------------------------------
  // Un nodo hecho en Steel Path aparece una sola vez, con Tier 1 — pero el
  // Steel Path exige el star chart completo, así que hacerlo en SP implica
  // haberlo hecho en normal. Contarlos como excluyentes descontaba justo los
  // nodos de quien más ha jugado.
  //
  // Tampoco se exige que el tag esté en el catálogo: @wfcd/items sólo trae 269
  // nodos y de ahí 26 son ClanNode (dojo, no star chart), así que faltan
  // decenas de SolNode reales. El prefijo del tag es un filtro más fiable.
  let normalNodes = 0;
  let spNodes = 0;
  let junctions = 0;
  let junctionsSP = 0;
  for (const m of inv.Missions ?? []) {
    const sp = m.Tier === 1;
    if (/Junction$/.test(m.Tag)) {
      junctions++;
      if (sp) junctionsSP++;
    } else if (/^(SolNode|SettlementNode)/.test(m.Tag)) {
      normalNodes++;
      if (sp) spNodes++;
    }
  }
  // El catálogo se queda corto, así que el denominador nunca puede ser menor
  // que lo que el jugador ya tiene hecho: si no, el porcentaje pasaría de 100.
  const totalNodes = Math.max(1, DATA.starChartNodes.length, normalNodes);

  const skills = inv.PlayerSkills ?? {};
  const sum = (prefix: string, exclude?: string) =>
    Object.entries(skills)
      .filter(([k]) => k.startsWith(prefix) && (!exclude || !k.startsWith(exclude)))
      .reduce((n, [, v]) => n + v, 0);

  const extras: Extras = {
    junctions,
    junctionsSP,
    railjack: sum('LPS_', 'LPS_DRIFT_'),
    drifter: sum('LPS_DRIFT_'),
    // Estimación proporcional: XP máx del star chart × fracción de nodos hechos
    starChart: Math.round((EXTRAS_XP.starChart.max * normalNodes) / totalNodes),
    starChartSP: Math.round((EXTRAS_XP.starChartSP.max * spNodes) / totalNodes),
  };

  return {
    patch: { parts, built, mastered, ranks, relics, extras },
    summary: {
      mrInGame: inv.PlayerLevel,
      partsFound,
      primesBuilt,
      gearOwned,
      itemsMastered,
      itemsPartial,
      relicCount,
      starChartNodes: normalNodes,
      steelPathNodes: spNodes,
    },
  };
}
