import { useMemo, useRef } from 'react';
import { useStore } from '../lib/store';
import { fmt } from '../lib/mastery';
import { dayKey } from '../lib/dates';
import { SyncButton } from '../components/SyncButton';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import type { HistoryEvent } from '../types';

const KIND_ICON: Record<HistoryEvent['kind'], IconName> = {
  part: 'relic',
  built: 'hammer',
  mastered: 'star',
  unmastered: 'star',
  extra: 'up',
  import: 'up',
  sync: 'sync',
  note: 'note',
  target: 'star',
};

function groupByDay(events: HistoryEvent[]) {
  const days = new Map<string, HistoryEvent[]>();
  for (const e of events) {
    const day = dayKey(e.t);
    if (!days.has(day)) days.set(day, []);
    days.get(day)!.push(e);
  }
  return [...days.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Mastery XP acumulada según los eventos que llevan delta de XP. */
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

  const W = 800;
  const H = 132;
  const PAD = 10;
  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const vMax = Math.max(...pts.map((p) => p.v), 1);
  const vMin = Math.min(...pts.map((p) => p.v), 0);
  const x = (t: number) => PAD + ((t - t0) / Math.max(1, t1 - t0)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - vMin) / Math.max(1, vMax - vMin)) * (H - PAD * 2);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];

  return (
    <section className="card card--inlay spark">
      <div className="sect-h" style={{ marginBottom: 10 }}>
        <div>
          <div className="sect-t">Mastery XP acumulada</div>
          <div className="sect-s">según lo que has ido marcando en el registro</div>
        </div>
        <div className="sect-r">
          <span className="n spark-v">{fmt(last.v)} XP</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="fillGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L${x(t1).toFixed(1)},${H - PAD} L${x(t0).toFixed(1)},${H - PAD} Z`} fill="url(#fillGold)" />
        <path d={d} fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx={x(last.t)} cy={y(last.v)} r="3.5" fill="var(--gold-bright)" />
      </svg>
    </section>
  );
}

export function History() {
  const { progress, dispatch, exportJson, importJson } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const days = useMemo(() => groupByDay(progress.history), [progress.history]);

  return (
    <div className="stack">
      <div className="hist-tools">
        <SyncButton variant="full" />
        <button className="btn" onClick={exportJson}>
          <Icon name="down" size={14} />
          Exportar respaldo
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          <Icon name="up" size={14} />
          Importar respaldo
        </button>
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
          <Icon name="note" size={14} />
          Nota
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

      {days.length === 0 ? (
        <div className="card empty">
          Aún no hay eventos. Cada pieza, construcción o mastery que marques queda registrada aquí con fecha.
        </div>
      ) : (
        <section className="card sect">
          <div className="stack" style={{ gap: 22 }}>
            {days.map(([day, events]) => (
              <div key={day} className="day">
                <span className="k">
                  {new Date(day + 'T12:00:00').toLocaleDateString('es-CO', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                {[...events].reverse().map((e, i) => (
                  <div key={`${e.t}-${i}`} className="ev">
                    <time className="n">{e.t.slice(11, 16)}</time>
                    <span className="eico">
                      <Icon name={KIND_ICON[e.kind]} size={13} width={1.6} />
                    </span>
                    <p>{e.label}</p>
                    {e.xp !== undefined && (
                      <span className={`exp n ${e.xp < 0 ? 'is-neg' : ''}`}>
                        {e.xp >= 0 ? '+' : ''}
                        {fmt(e.xp)} XP
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
