import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { MasteryItem } from '../types';
import { CATEGORY_LABEL, gearPartKey } from '../lib/gameData';
import { useStore } from '../lib/store';
import { PERISHABLE, acquireLabel, depLabel, gapLabel, gearSteps, pendingConsumers, resourceGaps, resourcesKnown } from '../lib/selectors';
import { fmt, pendingXp } from '../lib/mastery';
import { CatIcon, Icon } from '../components/Icon';
import { TargetStar } from '../components/TargetStar';

/**
 * Cajón de un equipo normal — hermano de `PrimeDetail`, con la misma piel
 * (`.drawer`, `.dw-*`, `.comp`) para no inventar un segundo lenguaje visual.
 * Cambia lo que hay dentro: en vez de reliquias por pieza, la pieza con su
 * fuente cuando el catálogo la trae, el precio del blueprint cuando no, y
 * los recursos del crafteo con lo que te falta de cada uno.
 *
 * Con el ítem ya en el arsenal la ruta sobra: piezas y recursos se ocultan y
 * queda solo el rango, que es lo único que sigue importando.
 */
export function GearDetail({ item, onClose }: { item: MasteryItem; onClose: () => void }) {
  const { progress, dispatch } = useStore();
  const mastered = !!progress.mastered[item.name];
  const owned = !mastered && !!progress.built[item.name];
  const rank = Math.min(progress.ranks[item.name] ?? 0, item.cap);
  const steps = gearSteps(item, progress);
  const gaps = resourceGaps(item, progress);
  const known = resourcesKnown(progress);
  const keep = pendingConsumers(item, progress);
  const needs = item.needs ?? [];
  const acquire = acquireLabel(item);
  const partsTotal = (item.parts ?? []).reduce((n, p) => n + p.count, 0);
  const partsOwned = partsTotal - steps.reduce((n, s) => n + s.missing, 0);
  const crafting = !owned && !mastered && !item.founders;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  let verdict: ReactNode;
  let verdictIcon: 'check' | 'alert' | 'up' | 'info' = 'check';
  let verdictColor: string | undefined = 'var(--teal)';
  if (mastered) {
    verdict = 'Masterizado. No queda nada que hacer con este.';
    verdictColor = 'var(--gold)';
  } else if (item.founders) {
    verdictIcon = 'alert';
    verdictColor = 'var(--red)';
    verdict = 'Founders: no se puede conseguir por ningún medio.';
  } else if (owned) {
    verdictIcon = 'up';
    verdict = (
      <>
        En tu arsenal en rango {rank}/{item.cap}. Súbelo al tope y son{' '}
        <b className="n" style={{ color: 'var(--teal)' }}>{fmt(pendingXp(item, progress))} XP</b> de maestría.
      </>
    );
  } else if (partsTotal > 0 && steps.length === 0) {
    if (gaps.length > 0) {
      verdictIcon = 'alert';
      verdictColor = undefined;
      verdict = (
        <>
          Tienes todas las piezas, pero craftearlo pide <b>{gapLabel(gaps)}</b> que no tienes.
        </>
      );
    } else {
      verdictIcon = 'check';
      verdict = (
        <>
          Tienes todas las piezas. Constrúyelo en la foundry y son{' '}
          <b className="n" style={{ color: 'var(--teal)' }}>{fmt(item.xp)} XP</b>.
        </>
      );
    }
  } else if (steps.length > 0) {
    verdictIcon = 'alert';
    verdictColor = undefined;
    const withDrop = steps.filter((s) => s.drop);
    verdict = (
      <>
        Te falta{steps.length === 1 ? ' una pieza' : `n ${steps.length} piezas`}.
        {withDrop.length > 0
          ? ` ${withDrop.length === steps.length ? 'Todas' : `${withDrop.length}`} con fuente conocida — la ruta está abajo.`
          : ' El catálogo no dice de dónde salen: mercado, dojo, sindicato o quest.'}
      </>
    );
  } else {
    verdictIcon = 'info';
    verdictColor = undefined;
    verdict = acquire
      ? `No está en tu arsenal — ${acquire}.`
      : 'No está en tu arsenal y el catálogo no dice cómo se consigue: mercado, dojo, sindicato o quest.';
  }

  return (
    <>
      <div className="drawer-veil" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={item.name}>
        <div className="dw">
          <div className="dw-h">
            <span className="dw-ico">
              <CatIcon cat={item.category} size={30} />
            </span>
            <div>
              <h2>{item.name}</h2>
              <span className="k">
                {CATEGORY_LABEL[item.category] ?? item.category}
                {item.type && item.type !== item.category ? ` · ${item.type}` : ''}
                {item.mr ? ` · MR ${item.mr}` : ''}
                {` · ${fmt(item.xp)} XP`}
              </span>
            </div>
            <span className="dw-tools">
              {!item.founders && <TargetStar name={item.name} size={17} />}
              <button className="dw-x" onClick={onClose} aria-label="Cerrar">
                <Icon name="close" size={15} width={1.8} />
              </button>
            </span>
          </div>

          <section className="card card--inlay dw-sum">
            <div className="dw-sum-top">
              <div>
                <span className="k">{owned || mastered ? 'Rango' : 'Piezas'}</span>
                <div className="dw-count">
                  {owned || mastered ? (
                    <>
                      <b className="n">{mastered ? item.cap : rank}</b>
                      <s className="n">/ {item.cap}</s>
                      <span className={`badge badge--${mastered ? 'mastered' : 'built'}`}>
                        {mastered ? 'masterizado' : 'en el arsenal'}
                      </span>
                    </>
                  ) : partsTotal > 0 ? (
                    <>
                      <b className="n">{partsOwned}</b>
                      <s className="n">/ {partsTotal}</s>
                      <span className={`badge badge--${steps.length === 0 ? 'ready' : partsOwned > 0 ? 'partial' : 'missing'}`}>
                        {steps.length === 0 ? 'listo para construir' : partsOwned > 0 ? 'en progreso' : 'sin empezar'}
                      </span>
                    </>
                  ) : (
                    <>
                      <b className="n">—</b>
                      <span className="badge badge--missing">no lo tienes</span>
                    </>
                  )}
                </div>
              </div>
              {crafting && partsTotal > 0 && (
                <div className="pips dw-pips" aria-hidden>
                  {Array.from({ length: partsTotal }, (_, k) => (
                    <i key={k} className={k < partsOwned ? 'is-full' : ''} />
                  ))}
                </div>
              )}
            </div>

            <div className="goal-note">
              <Icon name={verdictIcon} size={15} width={1.7} color={verdictColor} />
              <span>{verdict}</span>
            </div>

            {keep.length > 0 && (
              <div className="goal-note">
                <Icon name="hammer" size={15} width={1.7} color="var(--gold)" />
                <span>
                  <b style={{ color: 'var(--gold-bright)' }}>No lo vendas:</b> se consume como ingrediente al
                  construir <b>{depLabel(keep)}</b>. Guárdalo hasta tener ese crafteo hecho.
                </span>
              </div>
            )}
            {crafting && needs.length > 0 && (
              <div className="goal-note">
                <Icon name="hammer" size={15} width={1.7} color="var(--gold)" />
                <span>
                  Además de las piezas, construirlo consume <b>{depLabel(needs)}</b>
                  {needs.every((n) => progress.built[n.name])
                    ? ` — según tu último sync ya ${needs.length > 1 ? 'los' : 'lo'} tienes.`
                    : needs.every((n) => progress.built[n.name] || progress.mastered[n.name])
                      ? ` — ${needs.length > 1 ? 'los' : 'lo'} masterizaste, pero confirma que no ${needs.length > 1 ? 'los' : 'lo'} vendiste.`
                      : ` — tendrás que conseguir${needs.length > 1 ? 'los' : 'lo'} primero.`}
                </span>
              </div>
            )}

            <div className="dw-acts">
              <button
                className={`chip ${mastered ? 'is-on' : ''}`}
                onClick={() => dispatch({ type: 'setMastered', itemName: item.name, mastered: !mastered })}
              >
                {mastered ? '✓ Masterizado' : 'Marcar masterizado'}
              </button>
            </div>
          </section>

          {crafting && (item.parts?.length ?? 0) > 0 && (
            <div className="comp">
              <div className="comp-h">
                <b>Piezas</b>
                <span className="k">de dónde salen, según el catálogo</span>
              </div>
              <div className="gd-list">
                {item.parts!.map((p) => {
                  const have = Math.min(progress.parts[gearPartKey(item, p)] ?? 0, p.count);
                  const drop = p.drops?.[0];
                  return (
                    <div key={p.name} className={`hstep hstep--gear ${have >= p.count ? 'is-mine' : ''}`}>
                      <span className="hs-part">
                        {p.name}
                        {p.count > 1 && <em className="n"> ×{p.count}</em>}
                      </span>
                      <span className={`hs-have n ${have >= p.count ? 'is-ok' : ''}`}>
                        {have} / {p.count}
                      </span>
                      {drop ? (
                        <>
                          <span className="hs-src" title={p.drops!.map((d) => `${d.where} · ${d.chance.toFixed(1)}%`).join('\n')}>
                            {drop.where}
                          </span>
                          <span className="hs-pct n">{drop.chance.toFixed(1)}%</span>
                        </>
                      ) : (
                        <>
                          <span className="hs-src faint">
                            {p.name === 'Blueprint' && acquire ? acquire : 'sin fuente en el catálogo'}
                          </span>
                          <span className="hs-pct faint">—</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {crafting && (item.resources?.length ?? 0) > 0 && (
            <div className="comp">
              <div className="comp-h">
                <b>Recursos del crafteo</b>
                <span className="k">
                  {!known
                    ? 'sincroniza para ver qué te falta'
                    : gaps.length === 0
                      ? 'los tienes todos'
                      : `faltan ${gapLabel(gaps)}`}
                </span>
              </div>
              <div className="gd-list">
                {item.resources!.map((r) => {
                  const have = progress.resources[r.name] ?? 0;
                  const gap = known && have < r.count;
                  return (
                    <div key={r.name} className={`res ${gap ? 'is-gap' : ''}`}>
                      <span className="res-n">
                        {r.name}
                        {PERISHABLE.has(r.name) && <em className="faint"> · se pudre en 24 h: fármalo al final</em>}
                      </span>
                      <span className="res-c n">{known ? `${fmt(have)} / ${fmt(r.count)}` : `×${fmt(r.count)}`}</span>
                      {gap ? <span className="badge badge--missing">falta {fmt(r.count - have)}</span> : <span />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="foot dw-foot">
            <span>
              Piezas y recursos salen de tu último sync con AlecaFrame. Las fuentes son las mejores que trae el catálogo;
              donde dice «mercado o dojo» es porque el dato no distingue una de otra.
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
