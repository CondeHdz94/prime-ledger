import { useMemo, useState } from 'react';
import { CATEGORY_LABEL, CDN_IMG, PRIMES, partsNeeded } from '../lib/gameData';
import { useStore } from '../lib/store';
import { ownedParts, primeStatus, STATUS_LABEL } from '../lib/selectors';
import type { PrimeStatus } from '../lib/selectors';
import { PrimeDetail } from './PrimeDetail';

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

export function Primes({ openPrime, onOpen, onClose }: {
  openPrime: string | null;
  onOpen: (name: string) => void;
  onClose: () => void;
}) {
  const { progress } = useStore();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PRIMES.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (needle && !p.name.toLowerCase().includes(needle)) return false;
      const st = primeStatus(p, progress);
      switch (status) {
        case 'all': return true;
        case 'farmable': return !!p.farmable && st !== 'mastered';
        case 'vaulted': return !p.farmable && !p.founders;
        default: return st === status;
      }
    });
  }, [progress, status, cat, q]);

  const detail = openPrime ? PRIMES.find((p) => p.name === openPrime) : undefined;

  return (
    <div>
      <div className="filters">
        <input
          type="search"
          placeholder="Buscar prime…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="sep" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip ${status === f.id ? 'is-on' : ''}`}
            onClick={() => setStatus(f.id)}
          >
            {f.label}
          </button>
        ))}
        <span className="sep" />
        {CATS.map((c) => (
          <button
            key={c}
            className={`chip ${cat === c ? 'is-on' : ''}`}
            onClick={() => setCat(cat === c ? null : c)}
          >
            {CATEGORY_LABEL[c] ?? c}
          </button>
        ))}
      </div>

      <div className="prime-grid">
        {list.map((p, i) => {
          const st = primeStatus(p, progress);
          const owned = ownedParts(p, progress);
          const total = partsNeeded(p);
          return (
            <button
              key={p.name}
              className="panel prime-card rise"
              style={{ animationDelay: `${Math.min(i, 20) * 18}ms` }}
              onClick={() => onOpen(p.name)}
            >
              <span className="pc-top">
                {CDN_IMG(p.image) && <img src={CDN_IMG(p.image)} alt="" loading="lazy" />}
                <span className="pc-name">
                  <b>{p.name}</b>
                  <span>{CATEGORY_LABEL[p.category] ?? p.category}</span>
                </span>
              </span>
              {total > 0 && (
                <span className="bar" aria-hidden>
                  <i style={{ width: `${(owned / total) * 100}%` }} />
                </span>
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
          );
        })}
        {list.length === 0 && <div className="empty" style={{ gridColumn: '1/-1' }}>Sin resultados con estos filtros.</div>}
      </div>

      {detail && <PrimeDetail prime={detail} onClose={onClose} />}
    </div>
  );
}
