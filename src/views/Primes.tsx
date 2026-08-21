import { useMemo, useState } from 'react';
import { CATEGORY_LABEL, PRIMES, partsNeeded } from '../lib/gameData';
import { useStore } from '../lib/store';
import { ownedParts, primeStatus, STATUS_LABEL } from '../lib/selectors';
import type { PrimeStatus } from '../lib/selectors';
import { Icon } from '../components/Icon';
import { PrimeArt } from '../components/PrimeArt';
import { TargetStar } from '../components/TargetStar';

type StatusFilter = 'all' | PrimeStatus | 'farmable' | 'vaulted';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'missing', label: 'Faltantes' },
  { id: 'partial', label: 'En progreso' },
  { id: 'ready', label: 'Piezas listas' },
  { id: 'built', label: 'Construidos' },
  { id: 'mastered', label: 'Masterizados' },
  { id: 'farmable', label: 'Farmeable hoy' },
  { id: 'vaulted', label: 'En Vault' },
];

const CATS = ['Warframes', 'Primary', 'Secondary', 'Melee', 'Sentinels', 'Arch-Gun', 'Arch-Melee', 'Archwing'];

export function Primes({ onOpen }: { onOpen: (name: string) => void }) {
  const { progress } = useStore();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState('');

  /** Conteo por estado para las fichas de filtro — se ve el reparto sin filtrar. */
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, farmable: 0, vaulted: 0 };
    for (const p of PRIMES) {
      if (p.founders) continue;
      c.all++;
      const st = primeStatus(p, progress);
      c[st] = (c[st] ?? 0) + 1;
      if (p.farmable && st !== 'mastered') c.farmable++;
      if (!p.farmable) c.vaulted++;
    }
    return c;
  }, [progress]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PRIMES.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (needle && !p.name.toLowerCase().includes(needle)) return false;
      const st = primeStatus(p, progress);
      switch (status) {
        case 'all':
          return true;
        case 'farmable':
          return !!p.farmable && st !== 'mastered';
        case 'vaulted':
          return !p.farmable && !p.founders;
        default:
          return st === status;
      }
    });
  }, [progress, status, cat, q]);

  return (
    <div className="stack">
      <div className="filters">
        <label className="search">
          <Icon name="search" size={15} width={1.7} />
          <input type="search" placeholder="Buscar prime…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <span className="vsep" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip ${status === f.id ? 'is-on' : ''}`}
            onClick={() => setStatus(f.id)}
            aria-pressed={status === f.id}
          >
            {f.label}
            {counts[f.id] !== undefined && <span className="n faint">{counts[f.id]}</span>}
          </button>
        ))}
        <span className="vsep" />
        {CATS.map((c) => (
          <button
            key={c}
            className={`chip ${cat === c ? 'is-on' : ''}`}
            onClick={() => setCat(cat === c ? null : c)}
            aria-pressed={cat === c}
          >
            {CATEGORY_LABEL[c] ?? c}
          </button>
        ))}
      </div>

      <div className="pgrid">
        {list.map((p, i) => {
          const st = primeStatus(p, progress);
          const owned = ownedParts(p, progress);
          const total = partsNeeded(p);
          return (
            /* La estrella va fuera del botón de la tarjeta: un <button> dentro
               de otro <button> es HTML inválido y rompe el teclado. */
            <div
              key={p.name}
              className={`pcard-wrap rise ${progress.targets[p.name] ? 'is-target' : ''}`}
              style={{ animationDelay: `${Math.min(i, 16) * 16}ms` }}
            >
              <TargetStar primeName={p.name} size={15} className="pc-star" />
              <button className="card pcard" onClick={() => onOpen(p.name)}>
              <span className="pc-top">
                <PrimeArt image={p.image} category={p.category} size={22} imgClass="pc-art" glyphClass="pc-ico" />
                <span className="pc-n">
                  <b>{p.name}</b>
                  <span>{CATEGORY_LABEL[p.category] ?? p.category}</span>
                </span>
              </span>

              {total > 0 && (
                <>
                  <span className="pc-parts">
                    <span>piezas</span>
                    <span className="n">
                      {owned} / {total}
                    </span>
                  </span>
                  <span className="pips" aria-hidden>
                    {Array.from({ length: total }, (_, k) => (
                      <i key={k} className={k < owned ? 'is-full' : ''} />
                    ))}
                  </span>
                </>
              )}

              <span className="pc-foot">
                <span className={`badge badge--${st}`}>{STATUS_LABEL[st]}</span>
                {p.founders ? (
                  <span className="badge badge--vault">Founders</span>
                ) : p.farmable ? (
                  <span className="badge badge--farm">Farmeable</span>
                ) : (
                  <span className="badge badge--vault">Vault</span>
                )}
                </span>
              </button>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="empty" style={{ gridColumn: '1/-1' }}>
            Sin resultados con estos filtros.
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div className="foot">
          <Icon name="info" size={14} width={1.6} />
          <span>
            Mostrando {list.length} de {PRIMES.length} primes. Toca una tarjeta para ver piezas, reliquias y qué tienes
            en el inventario.
          </span>
        </div>
      )}
    </div>
  );
}
