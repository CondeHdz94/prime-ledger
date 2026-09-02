import { useMemo, useState } from 'react';
import { CATEGORY_LABEL, MASTERY_GEAR } from '../lib/gameData';
import { useStore } from '../lib/store';
import { depLabel, levelUpQueue, pendingConsumers } from '../lib/selectors';
import { EXTRAS_XP, MR30_XP, extrasXp, fmt, gearXp, mrGoal, mrLabel, pendingXp, remainingGearXp, totalXp } from '../lib/mastery';
import { CatIcon, Icon } from '../components/Icon';
import type { Extras, MasteryItem } from '../types';

const CAT_ORDER = [
  'Warframes',
  'Primary',
  'Secondary',
  'Melee',
  'Sentinels',
  'Pets',
  'Arch-Gun',
  'Arch-Melee',
  'Archwing',
  'Necramech',
  'Railjack',
  'Misc',
];

interface CatBucket {
  cat: string;
  items: MasteryItem[];
  done: number;
  /** XP que aún puedes reclamar en esta categoría */
  pending: number;
}

export function Mastery() {
  const { progress, dispatch } = useStore();
  const [q, setQ] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [onlyOwned, setOnlyOwned] = useState(false);

  const buckets = useMemo<CatBucket[]>(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map<string, MasteryItem[]>();
    for (const item of MASTERY_GEAR) {
      if (needle && !item.name.toLowerCase().includes(needle)) continue;
      if (onlyPending && progress.mastered[item.name]) continue;
      // "no lo tengo" y "lo tengo sin subir" son situaciones muy distintas:
      // una pide conseguir el arma, la otra solo jugarla un rato.
      if (onlyOwned && !progress.built[item.name]) continue;
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    const out: CatBucket[] = [];
    for (const [cat, items] of map) {
      let done = 0;
      let pending = 0;
      for (const i of items) {
        if (progress.mastered[i.name]) done++;
        else if (!i.founders) pending += i.xp;
      }
      out.push({ cat, items, done, pending });
    }
    // Ordenado por XP que aún puedes reclamar, no alfabéticamente:
    // así la categoría que más te acerca a MR 30 queda arriba.
    out.sort((a, b) => b.pending - a.pending || CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat));
    return out;
  }, [q, onlyPending, onlyOwned, progress.mastered, progress.built]);

  const xp = totalXp(progress);
  const { mr, goal, toGoal, pct, chasingMr30 } = mrGoal(xp);
  const remaining = remainingGearXp(progress);
  const masteredCount = MASTERY_GEAR.filter((g) => progress.mastered[g.name]).length;
  const ownedPending = useMemo(() => levelUpQueue(progress), [progress]);
  const ownedPendingXp = ownedPending.reduce((n, g) => n + pendingXp(g, progress), 0);
  const gearPct = (masteredCount / MASTERY_GEAR.length) * 100;
  const reachable = toGoal <= remaining;

  return (
    <div className="stack">
      <div className="mini">
        <div className="card card--inlay">
          <span className="k">Equipo masterizado</span>
          <b className="n" style={{ color: 'var(--gold-bright)' }}>
            {masteredCount}
            <s> / {MASTERY_GEAR.length}</s>
          </b>
          <p>{gearPct.toFixed(1)} % del arsenal masterizable</p>
          <div className="bar" style={{ marginTop: 12 }}>
            <i style={{ width: `${gearPct}%` }} />
          </div>
        </div>

        {/* Lo más barato que existe para MR: ya lo tienes, solo hay que jugarlo. */}
        <div className="card card--inlay">
          <span className="k">En tu arsenal sin subir</span>
          <b className="n" style={{ color: ownedPending.length > 0 ? 'var(--teal)' : undefined }}>
            {ownedPending.length}
            <s> ítems</s>
          </b>
          <p>
            {ownedPending.length > 0
              ? `${fmt(ownedPendingXp)} XP sin farmear nada — solo subirlos a rango máximo`
              : 'nada pendiente de lo que ya tienes'}
          </p>
          <div className="bar bar--teal" style={{ marginTop: 12 }}>
            <i style={{ width: `${Math.min(100, (ownedPendingXp / Math.max(1, remaining)) * 100)}%` }} />
          </div>
        </div>

        <div className="card card--inlay">
          <span className="k">XP de equipo</span>
          <b className="n">{fmt(gearXp(progress))}</b>
          <p>+ {fmt(extrasXp(progress.extras))} XP de star chart, junctions e intrínsecos</p>
          <div className="bar" style={{ marginTop: 12 }}>
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="card card--inlay">
          <span className="k">{reachable ? 'Techo alcanzable' : 'Falta por cubrir'}</span>
          <b className="n" style={{ color: reachable ? 'var(--teal)' : 'var(--red)' }}>
            {reachable ? mrLabel(goal) : `MR ${mr}`}
          </b>
          <p>
            {reachable
              ? `quedan ${fmt(remaining)} XP en equipo pendiente · sobra margen`
              : `el equipo pendiente da ${fmt(remaining)} XP y faltan ${fmt(toGoal)}`}
          </p>
          <div className={`bar ${reachable ? 'bar--teal' : ''}`} style={{ marginTop: 12 }}>
            <i style={{ width: `${Math.min(100, (remaining / Math.max(1, toGoal)) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* ── XP que no viene de equipo ─────────────────────────── */}
      <section className="card sect">
        <div className="sect-h">
          <div>
            <div className="sect-t">XP fuera del arsenal</div>
            <div className="sect-s">star chart, junctions e intrínsecos — se llenan a mano, el juego no los exporta</div>
          </div>
          <div className="sect-r">
            <span className="badge badge--mastered">{fmt(extrasXp(progress.extras))} XP</span>
          </div>
        </div>
        <div className="extras-grid">
          {(Object.keys(EXTRAS_XP) as (keyof Extras)[]).map((k) => {
            const meta = EXTRAS_XP[k];
            const value = progress.extras[k] ?? 0;
            return (
              <div key={k} className="extra-field">
                <label htmlFor={`extra-${k}`}>{meta.label}</label>
                <div className="extra-row">
                  <input
                    id={`extra-${k}`}
                    type="number"
                    min={0}
                    max={meta.max}
                    value={value || ''}
                    placeholder="0"
                    onChange={(e) => dispatch({ type: 'setExtra', key: k, value: Number(e.target.value) || 0 })}
                  />
                  <span className="n extra-xp">= {fmt(Math.min(value, meta.max) * meta.per)} XP</span>
                </div>
                <div className="bar">
                  <i style={{ width: `${Math.min(100, (value / meta.max) * 100)}%` }} />
                </div>
                <small>{meta.hint}</small>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── el arsenal, categoría por categoría ───────────────── */}
      <section className="card sect">
        <div className="sect-h">
          <div>
            <div className="sect-t">Arsenal por categoría</div>
            <div className="sect-s">ordenado por XP que aún puedes reclamar, no alfabéticamente</div>
          </div>
          <div className="sect-r">
            <label className="search search--sm">
              <Icon name="search" size={14} width={1.7} />
              <input type="search" placeholder="Buscar equipo…" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <button
              className={`chip ${onlyPending ? 'is-on' : ''}`}
              onClick={() => setOnlyPending(!onlyPending)}
              aria-pressed={onlyPending}
            >
              Solo pendientes
            </button>
            <button
              className={`chip ${onlyOwned ? 'is-on' : ''}`}
              onClick={() => setOnlyOwned(!onlyOwned)}
              aria-pressed={onlyOwned}
              title="Equipo que ya está en tu arsenal según el último sync de AlecaFrame"
            >
              Solo lo que tengo
            </button>
          </div>
        </div>

        {buckets.length === 0 && <div className="empty">Sin resultados con ese filtro.</div>}

        <div className="rows">
          {buckets.map((b) => (
            <details key={b.cat} className="mast-cat" open={b.items.length <= 40}>
              <summary className="mrow">
                <span className="mrow-n">
                  <Icon name="chevron" size={13} width={2} className="caret" />
                  <span className="mrow-ico">
                    <CatIcon cat={b.cat} size={16} />
                  </span>
                  <b>{CATEGORY_LABEL[b.cat] ?? b.cat}</b>
                </span>
                <span className="bar">
                  <i style={{ width: `${(b.done / Math.max(1, b.items.length)) * 100}%` }} />
                </span>
                <span className="cnt n">
                  {b.done} / {b.items.length}
                </span>
                <span className="xp n">{b.pending > 0 ? `+${fmt(b.pending)} XP` : '—'}</span>
              </summary>

              <div className="mast-list">
                {b.items.map((item) => {
                  const on = !!progress.mastered[item.name];
                  // lo tienes pero no lo has subido: XP a un rato de juego
                  const owned = !on && !!progress.built[item.name];
                  // es ingrediente de un crafteo aún pendiente: no venderlo
                  const keep = pendingConsumers(item, progress);
                  const notes = [
                    keep.length > 0 ? `⚠ NO VENDER: se consume al construir ${depLabel(keep)}` : '',
                    item.needs?.length ? `construirlo gasta ${depLabel(item.needs)}` : '',
                  ].filter(Boolean);
                  const base = owned
                    ? `${item.name} · lo tienes en el arsenal sin subir · ${fmt(pendingXp(item, progress))} XP por sacar (rango ${progress.ranks[item.name] ?? 0}/${item.cap})`
                    : `${item.name} · ${fmt(item.xp)} XP (rango ${item.cap})`;
                  return (
                    <button
                      key={item.name}
                      className={`mast-item ${on ? 'is-done' : ''} ${owned ? 'is-owned' : ''} ${keep.length > 0 ? 'is-keep' : ''}`}
                      onClick={() => dispatch({ type: 'setMastered', itemName: item.name, mastered: !on })}
                      title={[base, ...notes].join(' · ')}
                      aria-pressed={on}
                    >
                      <span className="mi-check">{on && <Icon name="check" size={9} width={3} />}</span>
                      <span className="mi-name">
                        {item.name}
                        {item.founders ? ' ✦' : ''}
                      </span>
                      {keep.length > 0 && <Icon name="hammer" size={13} width={1.9} className="mi-keep" />}
                      <span className="mi-xp n">
                        {item.cap > 30 ? `R${item.cap} ` : ''}
                        {(item.xp / 1000).toFixed(0)}k
                      </span>
                    </button>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </section>

      <div className="foot">
        <Icon name="info" size={14} width={1.6} />
        <span>
          MR {mr} son {fmt(xp)} XP.{' '}
          {chasingMr30
            ? `Cada rango cuesta 2.500 × rango²; MR 30 son ${fmt(MR30_XP)}.`
            : 'Pasado MR 30 cada rango legendario cuesta 147.500 XP fijos.'}{' '}
          Los ítems con ✦ son de Founders y no cuentan como alcanzables. El martillo marca un arma que otro
          crafteo pendiente consume como ingrediente: no la vendas hasta construirlo (detalle en el tooltip).
        </span>
      </div>
    </div>
  );
}
