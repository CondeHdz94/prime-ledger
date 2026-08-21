import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Prime, PrimeComponent, Refinement, RelicRef } from '../types';
import { CATEGORY_LABEL, MASTERY_GEAR, marketSetSlug, marketUrl, partsNeeded, relicSources } from '../lib/gameData';
import { useStore } from '../lib/store';
import { ownedParts, primeStatus, relicOwned, sourceLabel, STATUS_LABEL } from '../lib/selectors';
import { fmt } from '../lib/mastery';
import { Icon } from '../components/Icon';
import { PrimeArt } from '../components/PrimeArt';
import { TargetStar } from '../components/TargetStar';

const REFINEMENT_ES: Record<Refinement, string> = {
  Intact: 'int',
  Exceptional: 'exc',
  Flawless: 'imp',
  Radiant: 'rad',
};

const REF_ORDER: Refinement[] = ['Radiant', 'Flawless', 'Exceptional', 'Intact'];

function stockLabel(states: Partial<Record<Refinement, number>> | undefined): string {
  if (!states) return 'no tienes';
  const parts = REF_ORDER.filter((r) => (states[r] ?? 0) > 0).map((r) => `×${states[r]} ${REFINEMENT_ES[r]}`);
  return parts.length ? parts.join(' · ') : 'no tienes';
}

/** Solo se colapsa cuando esconder de verdad rinde: con 3 o 4 vaulteadas,
 *  un botón de "ver más" cuesta más de lo que ahorra. */
const VAULT_COLLAPSE_AT = 5;

/**
 * Las reliquias de una pieza, ordenadas por lo que puedes hacer con ellas:
 *
 *   1. las que tienes    — abribles esta noche, estén activas o no
 *   2. activas sin tener — hay que farmearlas primero
 *   3. vault sin tener   — ruido: se colapsa
 *
 * Tener la reliquia gana sobre que siga cayendo, porque es acción inmediata
 * contra acción con farmeo de por medio. El 96% del catálogo de reliquias
 * está vaulteado, así que sin esto la señal se pierde: una pieza como
 * Braton Prime / Stock trae 2 activas debajo de 44 muertas.
 */
function RelicRail({ component, have }: { component: PrimeComponent; have: number }) {
  const { progress } = useStore();
  const [open, setOpen] = useState(false);

  const { visible, hidden } = useMemo(() => {
    const byChance = (a: RelicRef, b: RelicRef) => (b.chances.Radiant ?? 0) - (a.chances.Radiant ?? 0);
    const mine: RelicRef[] = [];
    const active: RelicRef[] = [];
    const vaulted: RelicRef[] = [];
    for (const r of component.relics) {
      if (relicOwned(progress, r.relic) > 0) mine.push(r);
      else if (r.active) active.push(r);
      else vaulted.push(r);
    }
    mine.sort(byChance);
    active.sort(byChance);
    vaulted.sort(byChance);
    return { visible: [...mine, ...active], hidden: vaulted };
  }, [component, progress]);

  const collapse = hidden.length > VAULT_COLLAPSE_AT;
  const rows = collapse && !open ? visible : [...visible, ...hidden];

  const row = (r: RelicRef) => {
    const states = progress.relics[r.relic];
    const stock = relicOwned(progress, r.relic);
    // resaltada = la puedes abrir ya y aún te falta la pieza
    const mine = stock > 0 && have < component.count;
    return (
      <div key={r.relic} className={`rr ${mine ? 'is-mine' : ''}`}>
        <span className={`rn2 ${r.active ? '' : 'is-off'}`}>
          <i className={`dot dot--${r.rarity.toLowerCase()}`} />
          {r.relic}
        </span>
        <span className={`stock ${stock > 0 ? 'has' : 'zero'}`} title={stockLabel(states)}>
          <Icon name="relic" size={12} width={1.6} />
          {stock > 0 ? stockLabel(states) : 'no tienes'}
        </span>
        <span className="src">{r.active ? sourceLabel(relicSources(r.relic)[0]) : 'reliquia en vault'}</span>
        <span className="odds n">
          int {(r.chances.Intact ?? 0).toFixed(1)}% · rad <b>{(r.chances.Radiant ?? 0).toFixed(1)}%</b>
        </span>
      </div>
    );
  };

  return (
    <>
      {rows.map(row)}
      {collapse && (
        <button className={`rr-more ${open ? 'is-open' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
          <Icon name="chevron" size={13} width={2} className="caret" />
          {open
            ? `Ocultar las ${hidden.length} en vault`
            : visible.length === 0
              ? `Sus ${hidden.length} reliquias están en vault — ver de todos modos`
              : `Ver ${hidden.length} reliquias más, todas en vault`}
        </button>
      )}
    </>
  );
}

export function PrimeDetail({ prime, onClose }: { prime: Prime; onClose: () => void }) {
  const { progress, dispatch } = useStore();
  const st = primeStatus(prime, progress);
  const owned = ownedParts(prime, progress);
  const total = partsNeeded(prime);
  const masteryXp = MASTERY_GEAR.find((g) => g.name === prime.name)?.xp;
  const setSlug = marketSetSlug(prime);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** Reliquias tuyas, activas, que dan una pieza que aún te falta. */
  const usable = useMemo(() => {
    const names = new Set<string>();
    for (const c of prime.components) {
      if ((progress.parts[c.fullName] ?? 0) >= c.count) continue;
      for (const r of c.relics) {
        if (r.active && relicOwned(progress, r.relic) > 0) names.add(r.relic);
      }
    }
    return [...names];
  }, [prime, progress]);

  let verdict: ReactNode;
  let verdictIcon: 'check' | 'alert' = 'check';
  if (prime.components.length === 0) {
    verdict = 'Este prime no se obtiene por reliquias — es recompensa especial o de evento.';
  } else if (progress.mastered[prime.name]) {
    verdict = 'Masterizado. No queda nada que hacer con este.';
  } else if (progress.built[prime.name]) {
    verdict = (
      <>
        Construido. Súbelo a rango máximo para reclamar{' '}
        <b className="n" style={{ color: 'var(--teal)' }}>{masteryXp ? fmt(masteryXp) : '—'} XP</b> de maestría.
      </>
    );
  } else if (owned >= total) {
    verdict = (
      <>
        Tienes las {total} piezas. Constrúyelo en la foundry y son{' '}
        <b className="n" style={{ color: 'var(--teal)' }}>{masteryXp ? fmt(masteryXp) : '—'} XP</b>.
      </>
    );
  } else if (usable.length > 0) {
    verdict = (
      <>
        Puedes avanzar sin farmear: <b style={{ color: 'var(--teal)' }}>{usable.join(', ')}</b>{' '}
        {usable.length === 1 ? 'ya está' : 'ya están'} en tu inventario y {usable.length === 1 ? 'da' : 'dan'} piezas
        que te faltan.
      </>
    );
  } else {
    verdictIcon = 'alert';
    verdict = 'Ninguna reliquia de tu inventario cubre lo que falta — toca farmear las fuentes de abajo.';
  }

  return (
    <>
      <div className="drawer-veil" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={prime.name}>
        <div className="dw">
          <div className="dw-h">
            <PrimeArt
              image={prime.image}
              category={prime.category}
              size={30}
              imgClass="dw-art"
              glyphClass="dw-ico"
            />
            <div>
              <h2>{prime.name}</h2>
              <span className="k">
                {CATEGORY_LABEL[prime.category] ?? prime.category}
                {prime.releaseDate ? ` · ${prime.releaseDate.slice(0, 4)}` : ''}
                {' · '}
                {prime.founders ? 'Founders (no obtenible)' : prime.farmable ? 'farmeable hoy' : 'en el Vault'}
              </span>
            </div>
            <span className="dw-tools">
              <TargetStar primeName={prime.name} size={17} />
              <button className="dw-x" onClick={onClose} aria-label="Cerrar">
                <Icon name="close" size={15} width={1.8} />
              </button>
            </span>
          </div>

          {/* El veredicto arriba: qué falta y si se resuelve sin farmear. */}
          <section className="card card--inlay dw-sum">
            <div className="dw-sum-top">
              <div>
                <span className="k">Piezas</span>
                <div className="dw-count">
                  <b className="n">{owned}</b>
                  <s className="n">/ {total}</s>
                  <span className={`badge badge--${st}`}>{STATUS_LABEL[st]}</span>
                </div>
              </div>
              {total > 0 && (
                <div className="pips dw-pips" aria-hidden>
                  {Array.from({ length: total }, (_, k) => (
                    <i key={k} className={k < owned ? 'is-full' : ''} />
                  ))}
                </div>
              )}
            </div>

            <div className="goal-note">
              <Icon
                name={verdictIcon}
                size={15}
                width={1.7}
                color={verdictIcon === 'check' ? 'var(--teal)' : 'var(--red)'}
              />
              <span>{verdict}</span>
            </div>

            <div className="dw-acts">
              <button
                className={`chip ${progress.built[prime.name] ? 'is-on' : ''}`}
                onClick={() =>
                  dispatch({ type: 'setBuilt', primeName: prime.name, built: !progress.built[prime.name] })
                }
              >
                {progress.built[prime.name] ? '✓ Construido' : 'Marcar construido'}
              </button>
              <button
                className={`chip ${progress.mastered[prime.name] ? 'is-on' : ''}`}
                onClick={() =>
                  dispatch({ type: 'setMastered', itemName: prime.name, mastered: !progress.mastered[prime.name] })
                }
              >
                {progress.mastered[prime.name] ? '✓ Masterizado' : 'Marcar masterizado'}
              </button>
              {setSlug && (
                <a className="chip chip--link" href={marketUrl(setSlug)} target="_blank" rel="noreferrer">
                  <Icon name="relic" size={13} width={1.5} />
                  Set completo en warframe.market ↗
                </a>
              )}
            </div>
          </section>

          <div className="stack" style={{ gap: 12 }}>
            {prime.components.map((c) => {
              const have = Math.min(progress.parts[c.fullName] ?? 0, c.count);
              return (
                <div key={c.fullName} className="comp">
                  <div className="comp-h">
                    <b>
                      {c.name}
                      {c.count > 1 ? ` ×${c.count}` : ''}
                    </b>
                    {c.ducats ? <span className="duc n">{c.ducats} ducados</span> : null}
                    {c.market && (
                      <a href={marketUrl(c.market)} target="_blank" rel="noreferrer" className="k comp-mkt">
                        market ↗
                      </a>
                    )}
                    <span className="step">
                      <button
                        disabled={have <= 0}
                        aria-label={`Quitar una ${c.name}`}
                        onClick={() =>
                          dispatch({
                            type: 'setPart',
                            fullName: c.fullName,
                            owned: have - 1,
                            max: c.count,
                            primeName: prime.name,
                          })
                        }
                      >
                        <Icon name="minus" size={13} width={2} />
                      </button>
                      <span className={`c ${have >= c.count ? 'is-ok' : ''}`}>
                        {have} / {c.count}
                      </span>
                      <button
                        disabled={have >= c.count}
                        aria-label={`Añadir una ${c.name}`}
                        onClick={() =>
                          dispatch({
                            type: 'setPart',
                            fullName: c.fullName,
                            owned: have + 1,
                            max: c.count,
                            primeName: prime.name,
                          })
                        }
                      >
                        <Icon name="plus" size={13} width={2} />
                      </button>
                    </span>
                  </div>

                  <RelicRail component={c} have={have} />
                </div>
              );
            })}
          </div>

          <div className="foot dw-foot">
            <span>
              Orden: primero las que tienes, luego las activas, y las del vault al final. La segunda columna es tu
              inventario, leído del último sync con AlecaFrame — las filas
              resaltadas son las que ya puedes abrir. <i className="dot dot--common" /> común{' '}
              <i className="dot dot--uncommon" /> poco común <i className="dot dot--rare" /> rara. Los % son por
              apertura (intacta / radiante).
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
