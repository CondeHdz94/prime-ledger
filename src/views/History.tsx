import { useMemo, useRef } from 'react';
import { useStore } from '../lib/store';
import { fmt } from '../lib/mastery';
import type { HistoryEvent } from '../types';

const KIND_ICON: Record<HistoryEvent['kind'], string> = {
  part: '◈',
  built: '⚒',
  mastered: '★',
  unmastered: '☆',
  extra: '∴',
  import: '⇪',
  note: '·',
};

function groupByDay(events: HistoryEvent[]) {
  const days = new Map<string, HistoryEvent[]>();
  for (const e of events) {
    const day = e.t.slice(0, 10);
    if (!days.has(day)) days.set(day, []);
    days.get(day)!.push(e);
  }
  return [...days.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Cumulative mastery-XP sparkline from history events that carry xp. */
function Chart({ events }: { events: HistoryEvent[] }) {
  const pts = useMemo(() => {
    let acc = 0;
    const out: { t: number; v: number }[] = [];
    for (const e of events) {
      if (e.xp === undefined) continue;
      acc += e.xp;
      out.push({ t: new Date(e.t).getTime(), v: acc });
    }
    return out;
  }, [events]);

  if (pts.length < 2) return null;

  const W = 800, H = 150, PAD = 8;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const vMax = Math.max(...pts.map((p) => p.v), 1);
  const vMin = Math.min(...pts.map((p) => p.v), 0);
  const x = (t: number) => PAD + ((t - t0) / Math.max(1, t1 - t0)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - vMin) / Math.max(1, vMax - vMin)) * (H - PAD * 2);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');

  return (
    <div className="panel panel--ticked hist-chart">
      <div className="panel-head">
        <span className="label">Mastery XP acumulada (según registro)</span>
        <span className="label num" style={{ color: 'var(--gold)' }}>{fmt(pts[pts.length - 1].v)} XP</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="fillGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(201,169,97,0.35)" />
            <stop offset="100%" stopColor="rgba(201,169,97,0)" />
          </linearGradient>
        </defs>
        <path d={`${d} L${x(t1).toFixed(1)},${H - PAD} L${x(t0).toFixed(1)},${H - PAD} Z`} fill="url(#fillGold)" />
        <path d={d} fill="none" stroke="var(--gold)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function History() {
  const { progress, dispatch, exportJson, importJson } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const days = useMemo(() => groupByDay(progress.history), [progress.history]);

  return (
    <div>
      <div className="hist-tools">
        <button className="btn btn--gold" onClick={exportJson}>⇓ Exportar respaldo JSON</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>⇪ Importar respaldo</button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              await importJson(f);
            } catch {
              alert('Archivo no válido');
            }
            e.target.value = '';
          }}
        />
        <button
          className="btn"
          onClick={() => {
            const label = prompt('Nota para el registro:');
            if (label) dispatch({ type: 'note', label });
          }}
        >
          + Nota
        </button>
        <button
          className="btn btn--danger"
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            if (confirm('¿Borrar TODO el progreso y el historial? Exporta un respaldo antes.')) {
              dispatch({ type: 'reset' });
            }
          }}
        >
          Reiniciar todo
        </button>
      </div>

      <Chart events={progress.history} />

      {days.length === 0 && (
        <div className="panel empty">
          Aún no hay eventos. Cada pieza, construcción o mastery que marques queda registrada aquí con fecha.
        </div>
      )}

      {days.map(([day, events]) => (
        <div key={day} className="hist-day">
          <span className="label">
            {new Date(day + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          {[...events].reverse().map((e, i) => (
            <div key={`${e.t}-${i}`} className="hist-event">
              <time>{e.t.slice(11, 16)}</time>
              <span aria-hidden style={{ color: 'var(--gold)' }}>{KIND_ICON[e.kind]}</span>
              <span>{e.label}</span>
              {e.xp !== undefined && (
                <span className={`he-xp ${e.xp < 0 ? 'neg' : ''}`}>
                  {e.xp >= 0 ? '+' : ''}{fmt(e.xp)} XP
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
