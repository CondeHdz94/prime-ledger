import { useEffect } from 'react';
import type { Prime } from '../types';
import { CDN_IMG, CATEGORY_LABEL, marketUrl, relicSources } from '../lib/gameData';
import { useStore } from '../lib/store';
import { primeStatus, STATUS_LABEL } from '../lib/selectors';

export function PrimeDetail({ prime, onClose }: { prime: Prime; onClose: () => void }) {
  const { progress, dispatch } = useStore();
  const st = primeStatus(prime, progress);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="drawer-veil" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={prime.name}>
        <div className="drawer-head">
          {CDN_IMG(prime.image) && <img src={CDN_IMG(prime.image)} alt="" />}
          <div>
            <h2>{prime.name}</h2>
            <span className="label">
              {CATEGORY_LABEL[prime.category] ?? prime.category}
              {prime.releaseDate ? ` · ${prime.releaseDate.slice(0, 4)}` : ''}
              {' · '}
              {prime.founders ? 'Founders (no obtenible)' : prime.farmable ? 'Farmeable hoy' : 'En el Vault'}
            </span>
          </div>
          <button className="close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="drawer-actions">
          <span className={`badge badge--${st}`}>{STATUS_LABEL[st]}</span>
          <button
            className={`chip ${progress.built[prime.name] ? 'is-on' : ''}`}
            onClick={() => dispatch({ type: 'setBuilt', primeName: prime.name, built: !progress.built[prime.name] })}
          >
            {progress.built[prime.name] ? '✓ Construido' : 'Marcar construido'}
          </button>
          <button
            className={`chip ${progress.mastered[prime.name] ? 'is-on' : ''}`}
            onClick={() => dispatch({ type: 'setMastered', itemName: prime.name, mastered: !progress.mastered[prime.name] })}
          >
            {progress.mastered[prime.name] ? '✓ Masterizado' : 'Marcar masterizado'}
          </button>
        </div>

        {prime.components.length === 0 && (
          <p className="hint">
            Este prime no se obtiene por reliquias (recompensa especial / evento).
          </p>
        )}

        {prime.components.map((c) => {
          const owned = Math.min(progress.parts[c.fullName] ?? 0, c.count);
          return (
            <div key={c.fullName} className="comp-block">
              <div className="comp-head">
                <b>{c.name}{c.count > 1 ? ` ×${c.count}` : ''}</b>
                {c.ducats ? <span className="label">{c.ducats}𝔡</span> : null}
                {c.market && (
                  <a href={marketUrl(c.market)} target="_blank" rel="noreferrer" className="label" style={{ color: 'var(--teal)' }}>
                    market ↗
                  </a>
                )}
                <span className="stepper">
                  <button
                    disabled={owned <= 0}
                    onClick={() => dispatch({ type: 'setPart', fullName: c.fullName, owned: owned - 1, max: c.count, primeName: prime.name })}
                  >−</button>
                  <span className={`count ${owned >= c.count ? 'done' : ''}`}>{owned}/{c.count}</span>
                  <button
                    disabled={owned >= c.count}
                    onClick={() => dispatch({ type: 'setPart', fullName: c.fullName, owned: owned + 1, max: c.count, primeName: prime.name })}
                  >+</button>
                </span>
              </div>
              {c.relics.map((r) => {
                const src = relicSources(r.relic)[0];
                return (
                  <div key={r.relic} className="relic-row">
                    <span className={`rr-name ${r.active ? '' : 'inactive'}`}>
                      <i className={`dot dot--${r.rarity.toLowerCase()}`} />
                      {r.relic}
                    </span>
                    <span className="rr-src">
                      {r.active && src
                        ? `${src.where}${src.rot ? ` · Rot ${src.rot}` : ''}${src.mode ? ` (${src.mode})` : ''} · ${src.chance}%`
                        : 'reliquia en vault'}
                    </span>
                    <span className="rr-pct">
                      int {(r.chances.Intact ?? 0).toFixed(1)}%
                    </span>
                    <span className="rr-pct">
                      rad <b>{(r.chances.Radiant ?? 0).toFixed(1)}%</b>
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

        <p className="hint">
          Rareza: <i className="dot dot--common" /> común · <i className="dot dot--uncommon" /> poco común ·{' '}
          <i className="dot dot--rare" /> rara. Los % son por apertura de reliquia (Intacta / Radiante).
        </p>
      </aside>
    </>
  );
}
