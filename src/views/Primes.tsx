import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_LABEL } from '../lib/gameData';
import { useStore } from '../lib/store';
import { STATUS_LABEL } from '../lib/selectors';
import {
  buildRows,
  CATALOG,
  CATS,
  CONSIGO,
  emptySets,
  ESTADOS,
  filterPrimes,
  loadFilters,
  loadView,
  nextSort,
  saveFilters,
  saveView,
  SORTS,
  sortRows,
  toggle,
} from '../lib/primeFilters';
import type { Group, Opt, Row, Sets, SortKey, View } from '../lib/primeFilters';
import { Icon } from '../components/Icon';
import { PrimeArt } from '../components/PrimeArt';
import { TargetStar } from '../components/TargetStar';

const fmt = (n: number) => n.toLocaleString('es-CO');

/**
 * Cómo conseguirlo, con el mismo criterio que el filtro "Consigo": mientras
 * quede algo pendiente manda tu inventario real — una reliquia tuya vale
 * aunque el prime esté vaulteado. Ya completo, solo dice si sigue cayendo.
 */
function AcqBadge({ row }: { row: Row }) {
  const { p, st, acq, owned, total } = row;
  const pending = st !== 'mastered' && st !== 'built' && owned < total;
  if (!pending) {
    return <span className={`badge badge--${p.farmable ? 'farm' : 'vault'}`}>{p.farmable ? 'Farmeable' : 'Vault'}</span>;
  }
  if (acq.farmableNow) return <span className="badge badge--farm">Farmeable</span>;
  if (acq.hasRelics) return <span className="badge badge--ready">Tus reliquias</span>;
  return <span className="badge badge--vault">Vault</span>;
}

function Pips({ owned, total }: { owned: number; total: number }) {
  return (
    <span className="pips" aria-hidden>
      {Array.from({ length: total }, (_, k) => (
        <i key={k} className={k < owned ? 'is-full' : ''} />
      ))}
    </span>
  );
}

function PrimeCard({ row, i, onOpen }: { row: Row; i: number; onOpen: (name: string) => void }) {
  const { progress } = useStore();
  const { p, st, owned, total } = row;
  return (
    /* La estrella va fuera del botón de la tarjeta: un <button> dentro de otro
       <button> es HTML inválido y rompe el teclado. */
    <div
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
            <Pips owned={owned} total={total} />
          </>
        )}

        <span className="pc-foot">
          <span className={`badge badge--${st}`}>{STATUS_LABEL[st]}</span>
          <AcqBadge row={row} />
        </span>
      </button>
    </div>
  );
}

function PrimeRow({ row, onOpen }: { row: Row; onOpen: (name: string) => void }) {
  const { progress } = useStore();
  const { p, st, owned, total, xp, released } = row;
  return (
    <div className={`prow-wrap ${progress.targets[p.name] ? 'is-target' : ''}`}>
      <TargetStar primeName={p.name} size={14} className="pr-star" />
      <button className="prow" onClick={() => onOpen(p.name)}>
        <PrimeArt image={p.image} category={p.category} size={18} imgClass="pr-art" glyphClass="pr-ico" />
        <span className="pr-n">
          <b>{p.name}</b>
          <span>{CATEGORY_LABEL[p.category] ?? p.category}</span>
        </span>
        <span className="pr-parts">
          {total > 0 ? (
            <>
              <span className="n">
                {owned}/{total}
              </span>
              <Pips owned={owned} total={total} />
            </>
          ) : (
            <span className="faint">—</span>
          )}
        </span>
        <span className="pr-badge pr-status">
          <span className={`badge badge--${st}`}>{STATUS_LABEL[st]}</span>
        </span>
        <span className="pr-badge pr-acq">
          <AcqBadge row={row} />
        </span>
        <span className="pr-rel" title={released || undefined}>
          {released ? released.slice(0, 4) : '—'}
        </span>
        <span className="pr-xp n">{xp > 0 ? fmt(xp) : '—'}</span>
      </button>
    </div>
  );
}

export function Primes({ onOpen }: { onOpen: (name: string) => void }) {
  const { progress } = useStore();
  const [sets, setSets] = useState<Sets>(loadFilters);
  const [q, setQ] = useState('');
  const [{ view, sort }, setViewSort] = useState(loadView);

  useEffect(() => saveFilters(sets), [sets]);
  useEffect(() => saveView(view, sort), [view, sort]);

  const setView = (v: View) => setViewSort((s) => ({ ...s, view: v }));
  const setSort = (key: SortKey) => setViewSort((s) => ({ ...s, sort: nextSort(s.sort, key) }));

  const rows = useMemo(() => buildRows(progress), [progress]);
  const { list, counts, active } = useMemo(() => filterPrimes(rows, sets, q), [rows, sets, q]);
  const sorted = useMemo(() => sortRows(list, sort), [list, sort]);

  const clearAll = () => {
    setSets(emptySets());
    setQ('');
  };

  const group = <T extends string>(key: Group, label: string, options: Opt<T>[]) => (
    <div className="fgroup" role="group" aria-label={label}>
      <span className="fg-label">{label}</span>
      <div className="fg-chips">
        {options.map((o) => {
          const on = sets[key].has(o.id);
          const n = counts[key][o.id] ?? 0;
          return (
            <button
              key={o.id}
              className={`chip chip--check ${o.tone ? `chip--${o.tone}` : ''} ${on ? 'is-on' : ''}`}
              onClick={() => setSets({ ...sets, [key]: toggle(sets[key], o.id) })}
              aria-pressed={on}
              // Sin resultados y sin marcar: marcarlo solo vaciaría la grilla.
              disabled={!on && n === 0}
            >
              <span className="chk" aria-hidden>
                {on && <Icon name="check" size={10} width={3} />}
              </span>
              {o.label}
              <span className="n faint">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /**
   * Botón de orden. El mismo en las cabeceras de la lista y en la fila
   * "Orden" de la vista tarjetas: un solo estado, un solo comportamiento.
   * No lleva `aria-sort` porque esto no es una tabla — la dirección va en el
   * nombre accesible, que sí se lee en cualquier contexto.
   */
  const th = (key: SortKey, className: string) => {
    const s = SORTS.find((x) => x.id === key)!;
    const on = sort.key === key;
    return (
      <button
        key={key}
        className={`ph-cell ${className} ${on ? 'is-on' : ''}`}
        onClick={() => setSort(key)}
        aria-pressed={on}
        aria-label={`Ordenar por ${s.label.toLowerCase()}${on ? (sort.dir === 'asc' ? ', ascendente' : ', descendente') : ''}`}
      >
        {s.short}
        <Icon name={on && sort.dir === 'desc' ? 'down' : 'up'} size={11} width={2} />
      </button>
    );
  };

  return (
    <div className="stack">
      <div className="filterbar">
        <div className="fb-top">
          <label className="search">
            <Icon name="search" size={15} width={1.7} />
            <input type="search" placeholder="Buscar prime…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {active > 0 && (
            <button className="chip chip--clear" onClick={clearAll}>
              <Icon name="close" size={12} width={2.2} />
              Limpiar
              <span className="n faint">{active}</span>
            </button>
          )}

          <div className="fb-r">
            <div className="seg" role="group" aria-label="Vista">
              <button className={view === 'cards' ? 'is-on' : ''} onClick={() => setView('cards')} aria-pressed={view === 'cards'}>
                Tarjetas
              </button>
              <button className={view === 'list' ? 'is-on' : ''} onClick={() => setView('list')} aria-pressed={view === 'list'}>
                Lista
              </button>
            </div>
          </div>
        </div>

        {group('estado', 'Estado', ESTADOS)}
        {group('consigo', 'Consigo', CONSIGO)}
        {group('tipo', 'Tipo', CATS)}

        {/* En lista las cabeceras ya ordenan; repetirlo aquí serían dos mandos
            para lo mismo en la misma pantalla. En tarjetas no hay cabeceras,
            así que se saca la misma fila como un grupo más de la barra —
            mismos botones, mismo estado, sin popup del sistema de por medio. */}
        {view === 'cards' && (
          <div className="fgroup" role="group" aria-label="Orden">
            <span className="fg-label">Orden</span>
            <div className="fg-sorts">{SORTS.map((s) => th(s.id, 'sb-cell'))}</div>
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          Sin resultados con estos filtros.{' '}
          <button className="chip chip--link" onClick={clearAll}>
            Limpiar
          </button>
        </div>
      ) : view === 'cards' ? (
        <div className="pgrid">
          {sorted.map((row, i) => (
            <PrimeCard key={row.p.name} row={row} i={i} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div className="plist">
          <div className="phead">
            <span />
            {th('name', 'ph-n')}
            {th('progress', 'ph-parts')}
            {th('status', 'ph-badge ph-status')}
            <span className="ph-cell ph-badge ph-acq">Consigo</span>
            {th('release', 'ph-rel')}
            {th('xp', 'ph-xp')}
          </div>
          {sorted.map((row) => (
            <PrimeRow key={row.p.name} row={row} onOpen={onOpen} />
          ))}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="foot">
          <Icon name="info" size={14} width={1.6} />
          <span>
            Mostrando {sorted.length} de {CATALOG.length} primes. Toca una {view === 'cards' ? 'tarjeta' : 'fila'} para
            ver piezas, reliquias y qué tienes en el inventario.
          </span>
        </div>
      )}
    </div>
  );
}
