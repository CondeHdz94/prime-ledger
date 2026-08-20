import { useMemo, useState } from 'react';
import { CATEGORY_LABEL, MASTERY_GEAR } from '../lib/gameData';
import { useStore } from '../lib/store';
import { EXTRAS_XP, MR30_XP, extrasXp, fmt, gearXp, mrFromXp, totalXp } from '../lib/mastery';
import type { Extras } from '../types';

const CAT_ORDER = ['Warframes', 'Primary', 'Secondary', 'Melee', 'Sentinels', 'Pets', 'Arch-Gun', 'Arch-Melee', 'Archwing', 'Necramech', 'Railjack', 'Misc'];

export function Mastery() {
  const { progress, dispatch } = useStore();
  const [q, setQ] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);

  const byCat = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map<string, typeof MASTERY_GEAR>();
    for (const item of MASTERY_GEAR) {
      if (needle && !item.name.toLowerCase().includes(needle)) continue;
      if (onlyPending && progress.mastered[item.name]) continue;
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return map;
  }, [q, onlyPending, progress.mastered]);

  const xp = totalXp(progress);
  const mr = mrFromXp(xp);
  const masteredCount = MASTERY_GEAR.filter((g) => progress.mastered[g.name]).length;

  return (
    <div>
      <div className="mast-summary">
        <section className="panel panel--ticked stat-card">
          <span className="label">Equipo masterizado</span>
          <div className="big gold num">{masteredCount}<small> / {MASTERY_GEAR.length}</small></div>
          <div className="bar"><i style={{ width: `${(masteredCount / MASTERY_GEAR.length) * 100}%` }} /></div>
        </section>
        <section className="panel stat-card">
          <span className="label">XP de equipo</span>
          <div className="big num">{fmt(gearXp(progress))}</div>
          <div className="sub num">+ {fmt(extrasXp(progress.extras))} XP extras</div>
        </section>
        <section className="panel stat-card">
          <span className="label">MR actual estimado</span>
          <div className="big teal num">MR {mr}</div>
          <div className="sub num">{fmt(xp)} / {fmt(MR30_XP)} hacia MR 30</div>
          <div className="bar bar--teal"><i style={{ width: `${Math.min(100, (xp / MR30_XP) * 100)}%` }} /></div>
        </section>
        <section className="panel stat-card">
          <span className="label">Filtro</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <input type="search" placeholder="Buscar equipo…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className={`chip ${onlyPending ? 'is-on' : ''}`} onClick={() => setOnlyPending(!onlyPending)}>
              Solo pendientes
            </button>
          </div>
        </section>
      </div>

      <div className="panel-head">
        <span className="label">XP extra · star chart, junctions e intrínsecos</span>
      </div>
      <div className="extras-grid" style={{ marginBottom: 28 }}>
        {(Object.keys(EXTRAS_XP) as (keyof Extras)[]).map((k) => {
          const meta = EXTRAS_XP[k];
          return (
            <div key={k} className="panel extra-field">
              <label htmlFor={`extra-${k}`}>{meta.label}</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  id={`extra-${k}`}
                  type="number"
                  min={0}
                  max={meta.max}
                  value={progress.extras[k] || ''}
                  placeholder="0"
                  onChange={(e) => dispatch({ type: 'setExtra', key: k, value: Number(e.target.value) || 0 })}
                />
                <span className="num" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  = {fmt(Math.min(progress.extras[k] ?? 0, meta.max) * meta.per)} XP
                </span>
              </div>
              <small>{meta.hint}</small>
            </div>
          );
        })}
      </div>

      {CAT_ORDER.filter((c) => byCat.has(c)).map((c) => {
        const items = byCat.get(c)!;
        const done = items.filter((i) => progress.mastered[i.name]).length;
        return (
          <details key={c} className="panel mast-cat" open={items.length <= 40}>
            <summary>
              <b>{CATEGORY_LABEL[c] ?? c}</b>
              <span className="bar"><i style={{ width: `${(done / items.length) * 100}%` }} /></span>
              <span className="num">{done} / {items.length}</span>
            </summary>
            <div className="mast-list">
              {items.map((item) => {
                const on = !!progress.mastered[item.name];
                return (
                  <button
                    key={item.name}
                    className={`mast-item ${on ? 'is-done' : ''}`}
                    onClick={() => dispatch({ type: 'setMastered', itemName: item.name, mastered: !on })}
                    title={`${item.name} · ${fmt(item.xp)} XP (rango ${item.cap})`}
                  >
                    <span className="mi-check">{on ? '✓' : ''}</span>
                    <span className="mi-name">
                      {item.name}
                      {item.founders ? ' ✦' : ''}
                    </span>
                    <span className="mi-xp num">{item.cap > 30 ? `R${item.cap}` : ''} {(item.xp / 1000).toFixed(0)}k</span>
                  </button>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
