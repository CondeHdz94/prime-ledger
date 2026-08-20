/**
 * Importador de AlecaFrame — descifra `lastData.dat` (%localappdata%/AlecaFrame)
 * y lo convierte en un parche de Progress.
 *
 * El archivo es el JSON de inventario de DE cifrado con AES-128-CBC y una
 * clave estática pública (documentada en Sainan/alecaframe-inventory-parser).
 * Todo ocurre en el navegador: nada sale de tu máquina.
 */
import type { Extras, Progress } from '../types';
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
  patch: Pick<Progress, 'parts' | 'built' | 'mastered'> & { extras: Extras };
  summary: {
    mrInGame?: number;
    partsFound: number;
    primesBuilt: number;
    itemsMastered: number;
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
      const variants = [c.un, c.un.replace(/Component$/, 'Blueprint'), c.un.replace(/Blueprint$/, 'Component')];
      const owned = Math.min(c.count, variants.reduce((n, v) => n + (counts.get(v) ?? 0), 0));
      if (owned > 0) {
        parts[c.fullName] = owned;
        partsFound += owned;
      }
    }
  }

  // Primes construidos y equipo masterizado ---------------------------------
  const built: Record<string, boolean> = {};
  let primesBuilt = 0;
  for (const p of PRIMES) {
    if (p.un && ownedTypes.has(p.un)) {
      built[p.name] = true;
      primesBuilt++;
    }
  }

  const mastered: Record<string, boolean> = {};
  let itemsMastered = 0;
  for (const g of MASTERY_GEAR) {
    if (!g.un || !g.aff) continue;
    const xp = xpByType.get(g.un);
    if (xp !== undefined && xp >= g.aff) {
      mastered[g.name] = true;
      itemsMastered++;
    }
  }

  // Star chart, junctions e intrínsecos -------------------------------------
  const nodeSet = new Set(DATA.starChartNodes);
  let normalNodes = 0;
  let spNodes = 0;
  let junctions = 0;
  let junctionsSP = 0;
  for (const m of inv.Missions ?? []) {
    const sp = m.Tier === 1;
    if (/Junction$/.test(m.Tag)) {
      if (sp) junctionsSP++;
      else junctions++;
    } else if (nodeSet.has(m.Tag)) {
      if (sp) spNodes++;
      else normalNodes++;
    }
  }
  const totalNodes = Math.max(1, DATA.starChartNodes.length);

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
    patch: { parts, built, mastered, extras },
    summary: {
      mrInGame: inv.PlayerLevel,
      partsFound,
      primesBuilt,
      itemsMastered,
      starChartNodes: normalNodes,
      steelPathNodes: spNodes,
    },
  };
}
