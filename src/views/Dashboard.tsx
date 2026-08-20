import { useMemo } from 'react';
import { useStore } from '../lib/store';
import { farmTargets, tally } from '../lib/selectors';
import { MR30_XP, extrasXp, fmt, gearXp, mrFromXp, mrThreshold, remainingGearXp, totalXp } from '../lib/mastery';

export function Dashboard({ onOpenPrime }: { onOpenPrime: (name: string) => void }) {
  const { progress } = useStore();

  const t = useMemo(() => tally(progress), [progress]);
  const xp = totalXp(progress);
  const mr = mrFromXp(xp);
  const next = mr < 30 ? mrThreshold(mr + 1) : mrThreshold(mr + 1);
  const targets = useMemo(() => farmTargets(progress).slice(0, 10), [progress]);
  const remaining = remainingGearXp(progress);
  const toMr30 = Math.max(0, MR30_XP - xp);

  return (
    <div className="dash-grid">
      <section className="panel panel--ticked stat-card rise" style={{ animationDelay: '0ms' }}>
        <span className="label">Primes completos</span>
        <div className="big gold num">
          {t.mastered + t.built + t.ready}
          <small> / {t.total}</small>
        </div>
        <div className="sub">
          {t.mastered} masterizados · {t.built} construidos · {t.ready} con piezas
        </div>
        <div className="bar"><i style={{ width: `${((t.mastered + t.built + t.ready) / Math.max(1, t.total)) * 100}%` }} /></div>
      </section>

      <section className="panel stat-card rise" style={{ animationDelay: '40ms' }}>
        <span className="label">Piezas prime</span>
        <div className="big num">
          {t.partsOwned}
          <small> / {t.partsTotal}</small>
        </div>
        <div className="sub">{((t.partsOwned / Math.max(1, t.partsTotal)) * 100).toFixed(1)}% del total de partes</div>
        <div className="bar"><i style={{ width: `${(t.partsOwned / Math.max(1, t.partsTotal)) * 100}%` }} /></div>
      </section>

      <section className="panel stat-card rise" style={{ animationDelay: '80ms' }}>
        <span className="label">Mastery Rank</span>
        <div className="big teal num">MR {mr}</div>
        <div className="sub num">
          {fmt(xp)} XP · faltan {fmt(Math.max(0, next - xp))} para MR {mr + 1}
        </div>
        <div className="bar bar--teal"><i style={{ width: `${Math.min(100, (xp / MR30_XP) * 100)}%` }} /></div>
      </section>

      <section className="panel stat-card rise" style={{ animationDelay: '120ms' }}>
        <span className="label">Meta · MR 30</span>
        <div className="big num">{Math.min(100, (xp / MR30_XP) * 100).toFixed(1)}<small>%</small></div>
        <div className="sub num">faltan {fmt(toMr30)} XP de {fmt(MR30_XP)}</div>
        <div className="bar"><i style={{ width: `${Math.min(100, (xp / MR30_XP) * 100)}%` }} /></div>
      </section>

      <section className="panel panel--ticked dash-wide rise" style={{ animationDelay: '160ms' }}>
        <div className="panel-head">
          <span className="label">Farmeos recomendados · reliquias activas hoy</span>
          <span className="label" style={{ color: 'var(--teal)' }}>% radiante</span>
        </div>
        {targets.length === 0 ? (
          <div className="empty">Nada farmeable pendiente — o ya lo tienes todo, Tenno.</div>
        ) : (
          targets.map((ft) => (
            <button
              key={ft.component.fullName}
              className="farm-row"
              style={{ width: '100%' }}
              onClick={() => onOpenPrime(ft.prime.name)}
            >
              <span className="fr-part">
                <b>{ft.component.fullName}</b>
                <span>
                  {ft.prime.name} · faltan {ft.missing}
                </span>
              </span>
              <span className="fr-relic">
                <i className={`dot dot--${ft.relic.rarity.toLowerCase()}`} />
                {ft.relic.relic}
                {ft.owned > 0 && <em className="have">tienes {ft.owned}</em>}
              </span>
              <span className="fr-where">
                {ft.source ? `${ft.source.where}${ft.source.rot ? ` · Rot ${ft.source.rot}` : ''}` : '—'}
              </span>
              <span className="fr-chance">{(ft.relic.chances.Radiant ?? 0).toFixed(1)}%</span>
            </button>
          ))
        )}
      </section>

      <section className="panel dash-wide rise" style={{ animationDelay: '200ms' }}>
        <div className="panel-head">
          <span className="label">Desglose de mastery XP</span>
        </div>
        <div className="mrx-row">
          <span>Equipo masterizado</span>
          <span className="num">{fmt(gearXp(progress))} XP</span>
        </div>
        <div className="mrx-row">
          <span>Star chart · junctions · intrínsecos</span>
          <span className="num">{fmt(extrasXp(progress.extras))} XP</span>
        </div>
        <div className="mrx-row">
          <span>Disponible en equipo sin masterizar</span>
          <span className="num" style={{ color: 'var(--teal)' }}>+{fmt(remaining)} XP</span>
        </div>
        <div className="mrx-row">
          <span style={{ color: toMr30 <= remaining ? 'var(--teal)' : 'var(--red)' }}>
            {toMr30 <= remaining
              ? 'MR 30 es alcanzable solo con el equipo pendiente'
              : 'Necesitarás star chart / intrínsecos además del equipo'}
          </span>
          <span className="num">{fmt(toMr30)} XP restantes</span>
        </div>
      </section>
    </div>
  );
}
