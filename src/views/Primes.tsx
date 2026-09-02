import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CATEGORY_LABEL } from '../lib/gameData';
import { useStore } from '../lib/store';
import {
  buildRows,
  CATALOG,
  CATS,
  CONSIGO,
  emptySets,
  ESTADO_LABEL,
  ESTADOS,
  filterPrimes,
  loadFilters,
  loadView,
  nextSort,
  nextStep,
  PRESETS,
  saveFilters,
  saveView,
  SORTS,
  sortRows,
  toggle,
  uiStatus,
} from '../lib/primeFilters';
import type { EstadoKey, Group, Opt, PresetId, Row, Sets, SortKey, View } from '../lib/primeFilters';
import { Icon } from '../components/Icon';
import { PrimeArt } from '../components/PrimeArt';
import { TargetStar } from '../components/TargetStar';

const fmt = (n: number) => n.toLocaleString('es-CO');

/** Las opciones de cada eje, para nombrar filtros en tokens y sugerencias. */
const OPTS: Record<Group, Opt<string>[]> = { estado: ESTADOS, consigo: CONSIGO, tipo: CATS };
const GROUP_LABEL: Record<Group, string> = { estado: 'Estado', consigo: 'Consigo', tipo: 'Tipo' };

/**
 * Cómo conseguirlo, con el mismo criterio que el filtro "Consigo": mientras
 * quede algo pendiente manda tu inventario real — una reliquia tuya vale
 * aunque el prime esté vaulteado. Ya completo, el badge responde otra
 * pregunta — "¿sigue cayendo?" — porque "Farmeable" solo le sirve a quien
 * aún no lo tiene.
 */
function AcqBadge({ row }: { row: Row }) {
  const { p, st, acq, owned, total } = row;
  const pending = st !== 'mastered' && st !== 'built' && owned < total;
  if (!pending) {
    return <span className={`badge badge--${p.farmable ? 'farm' : 'vault'}`}>{p.farmable ? 'Sigue cayendo' : 'Vault'}</span>;
  }
  if (acq.farmableNow) return <span className="badge badge--farm">Farmeable</span>;
  if (acq.hasRelics) return <span className="badge badge--ready">Tus reliquias</span>;
  return <span className="badge badge--vault">Vault</span>;
}

/** Badge de estado: el masterizado lleva el sigil de maestría del juego. */
function EstadoBadge({ e }: { e: EstadoKey }) {
  return (
    <span className={`badge badge--${e}`}>
      {e === 'mastered' && <Icon name="mastery" size={11} width={2} />}
      {ESTADO_LABEL[e]}
    </span>
  );
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

function PrimeCard({ row, i, pinned, onOpen }: { row: Row; i: number; pinned: boolean; onOpen: (name: string) => void }) {
  const { progress } = useStore();
  const { p, st, owned, total } = row;
  const e = uiStatus(st);
  const step = nextStep(row, progress);
  return (
    /* La mira va fuera del botón de la tarjeta: un <button> dentro de otro
       <button> es HTML inválido y rompe el teclado. */
    <div
      className={`pcard-wrap rise ${progress.targets[p.name] ? 'is-target' : ''} ${pinned ? 'is-pinned' : ''} ${e === 'mastered' ? 'is-mastered' : ''}`}
      style={{ animationDelay: `${Math.min(i, 16) * 16}ms` }}
    >
      {pinned && <i className="pin-tag">Anclado</i>}
      <TargetStar primeName={p.name} size={14} className="pc-star" />
      <button className="card pcard" onClick={() => onOpen(p.name)}>
        <span className="pc-top">
          <PrimeArt image={p.image} category={p.category} size={26} imgClass="pc-art" glyphClass="pc-ico" />
          <span className="pc-n">
            <b title={p.name}>{p.name}</b>
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
          <EstadoBadge e={e} />
          <AcqBadge row={row} />
        </span>
        {/* title: los nodos largos (bounties de Fortuna/Cetus) se truncan */}
        <span className="pc-next" title={step}>
          {step}
        </span>
      </button>
    </div>
  );
}

function PrimeRow({ row, pinned, onOpen }: { row: Row; pinned: boolean; onOpen: (name: string) => void }) {
  const { progress } = useStore();
  const { p, st, owned, total, xp, released } = row;
  const e = uiStatus(st);
  return (
    <div className={`prow-wrap ${progress.targets[p.name] ? 'is-target' : ''} ${pinned ? 'is-pinned' : ''}`}>
      <TargetStar primeName={p.name} size={14} className="pr-star" />
      <button className="prow" onClick={() => onOpen(p.name)}>
        <PrimeArt image={p.image} category={p.category} size={20} imgClass="pr-art" glyphClass="pr-ico" />
        <span className="pr-n">
          <b title={p.name}>{p.name}</b>
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
          <EstadoBadge e={e} />
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
  const [{ view, sort, preset, railOpen }, setUi] = useState(loadView);
  /** cajón de filtros a pantalla completa (<860px) */
  const [drawer, setDrawer] = useState(false);
  /** eje Tipo expandido (arranca en las 4 categorías con más primes) */
  const [allCats, setAllCats] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => saveFilters(sets), [sets]);
  useEffect(() => saveView(view, sort, preset, railOpen), [view, sort, preset, railOpen]);

  // el menú de orden se cierra al hacer clic fuera o con Escape
  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (ev: PointerEvent) => {
      if (!sortRef.current?.contains(ev.target as Node)) setSortOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && setSortOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [sortOpen]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  const setView = (v: View) => setUi((s) => ({ ...s, view: v }));
  const setSort = (key: SortKey) => setUi((s) => ({ ...s, sort: nextSort(s.sort, key) }));
  const setRail = (open: boolean) => setUi((s) => ({ ...s, railOpen: open }));

  /** Elegir una vista reemplaza el conjunto de filtros. */
  const selectPreset = (id: PresetId) => {
    setSets(emptySets());
    setQ('');
    setUi((s) => ({ ...s, preset: id }));
    setDrawer(false);
  };

  /** Tocar cualquier casilla con una vista activa la convierte en «Todo +
   *  filtros»: el predicado se suelta y la vista deja de estar marcada. */
  const touch = (key: Group, id: string) => {
    setSets((prev) => ({ ...prev, [key]: toggle(prev[key], id) }));
    setUi((s) => ({ ...s, preset: null }));
  };
  const clearGroup = (key: Group) => setSets((prev) => ({ ...prev, [key]: new Set() }));
  const clearAll = () => {
    setSets(emptySets());
    setQ('');
    setUi((s) => ({ ...s, preset: 'all' }));
  };

  const rows = useMemo(() => buildRows(progress), [progress]);
  const presetDef = preset ? PRESETS.find((v) => v.id === preset) : undefined;
  const base = useMemo(
    () => (presetDef && presetDef.id !== 'all' ? rows.filter((r) => presetDef.pred(r, progress)) : rows),
    [rows, presetDef, progress],
  );
  const { list, counts, active } = useMemo(() => filterPrimes(base, sets, q), [base, sets, q]);
  const sorted = useMemo(() => sortRows(list, sort), [list, sort]);
  // Anclado: los "piezas listas" visibles van primero; el resto conserva el
  // orden elegido. Son 3–5 de 167 a un clic de dar maestría.
  const display = useMemo(
    () => [...sorted.filter((r) => r.st === 'ready'), ...sorted.filter((r) => r.st !== 'ready')],
    [sorted],
  );

  /** El conteo de cada vista es el resultado real de su predicado, no
   *  contextual: no cambia al marcar casillas. */
  const presetCounts = useMemo(() => {
    const m = {} as Record<PresetId, number>;
    for (const v of PRESETS) m[v.id] = v.id === 'all' ? rows.length : rows.filter((r) => v.pred(r, progress)).length;
    return m;
  }, [rows, progress]);

  const ready = useMemo(() => rows.filter((r) => r.st === 'ready'), [rows]);
  const readyXp = ready.reduce((n, r) => n + r.xp, 0);

  /** Sin resultados: qué filtro sobra, quitando un eje a la vez y quedándonos
   *  con el que más recupera. La búsqueda también compite. */
  const suggestion = useMemo(() => {
    if (list.length > 0) return null;
    let best: { label: string; n: number; group: Group | null } | null = null;
    for (const g of ['estado', 'consigo', 'tipo'] as Group[]) {
      if (sets[g].size === 0) continue;
      const n = filterPrimes(base, { ...sets, [g]: new Set<string>() }, q).list.length;
      if (n > (best?.n ?? 0)) {
        const ids = [...sets[g]];
        const label =
          ids.length === 1
            ? (OPTS[g].find((o) => o.id === ids[0])?.label ?? ids[0])
            : `los filtros de ${GROUP_LABEL[g]}`;
        best = { label, n, group: g };
      }
    }
    if (q.trim()) {
      const n = filterPrimes(base, sets, '').list.length;
      if (n > (best?.n ?? 0)) best = { label: `la búsqueda «${q.trim()}»`, n, group: null };
    }
    return best;
  }, [list.length, base, sets, q]);

  /** Tipo arranca en las 4 categorías con más primes del catálogo (conteo
   *  global, estable: con el contextual las filas bailarían al filtrar).
   *  Una categoría marcada nunca se esconde. */
  const topCats = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const p of CATALOG) totals[p.category] = (totals[p.category] ?? 0) + 1;
    return new Set(
      [...CATS]
        .sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0))
        .slice(0, 4)
        .map((o) => o.id),
    );
  }, []);
  const visibleCats = allCats ? CATS : CATS.filter((o) => topCats.has(o.id) || sets.tipo.has(o.id));
  const hiddenCats = CATS.length - visibleCats.length;

  const railGroup = (key: Group, options: Opt<string>[], extra?: ReactNode) => (
    <div className="rl-sec" role="group" aria-label={GROUP_LABEL[key]}>
      <div className="rl-h">
        <span className="rl-k">{GROUP_LABEL[key]}</span>
        {sets[key].size > 0 && (
          <button className="rl-clear" onClick={() => clearGroup(key)}>
            limpiar
          </button>
        )}
      </div>
      {options.map((o) => {
        const on = sets[key].has(o.id);
        const n = counts[key][o.id] ?? 0;
        return (
          <button
            key={o.id}
            className={`rl-row ${on ? 'is-on' : ''}`}
            onClick={() => touch(key, o.id)}
            aria-pressed={on}
            // Sin resultados y sin marcar: marcarlo solo vaciaría la grilla.
            disabled={!on && n === 0}
          >
            <span className="chk" aria-hidden>
              {on && <Icon name="check" size={10} width={3} />}
            </span>
            <span className="rl-l">{o.label}</span>
            <span className="rl-n n">{n}</span>
          </button>
        );
      })}
      {extra}
    </div>
  );

  const rail =
    railOpen || drawer ? (
      <aside className={`prail ${drawer ? 'is-drawer' : ''}`}>
        <div className="rl-head">
          <span className="rl-k">Vistas</span>
          <button
            className="rl-x"
            onClick={() => (drawer ? setDrawer(false) : setRail(false))}
            aria-label={drawer ? 'Cerrar filtros' : 'Colapsar filtros'}
          >
            <Icon name={drawer ? 'close' : 'chevron'} size={13} width={2} />
          </button>
        </div>
        <div className="rl-sec rl-views" role="group" aria-label="Vistas guardadas">
          {PRESETS.map((v) => (
            <button
              key={v.id}
              className={`rl-view ${preset === v.id ? 'is-on' : ''}`}
              onClick={() => selectPreset(v.id)}
              aria-pressed={preset === v.id}
            >
              {v.label}
              <span className="n">{presetCounts[v.id]}</span>
            </button>
          ))}
        </div>
        {railGroup('estado', ESTADOS)}
        {railGroup('consigo', CONSIGO)}
        {railGroup(
          'tipo',
          visibleCats,
          (hiddenCats > 0 || allCats) && (
            <button className="rl-more" onClick={() => setAllCats((a) => !a)}>
              {allCats ? 'Mostrar menos' : `${hiddenCats} categorías más`}
            </button>
          ),
        )}
      </aside>
    ) : (
      /* riel de 44px: solo el conteo de resultados y el de filtros activos */
      <aside className="prail is-mini">
        <button className="rl-mini" onClick={() => setRail(true)} aria-label="Abrir filtros">
          <Icon name="chevron" size={13} width={2} />
          <span className="rl-mini-n n" title={`${list.length} resultados`}>
            {list.length}
          </span>
          {active > 0 && (
            <span className="rl-mini-act n" title={`${active} filtros activos`}>
              {active}
            </span>
          )}
        </button>
      </aside>
    );

  const activeSort = SORTS.find((s) => s.id === sort.key)!;

  /**
   * Botón de orden de las cabeceras de la lista: atajo del MISMO estado que
   * mueve el chip. La flecha va plena en la columna activa y al 35% como
   * pista en las demás. Sin `aria-sort` porque esto no es una tabla — la
   * dirección va en el nombre accesible.
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

  const tokens: ReactNode[] = (['estado', 'consigo', 'tipo'] as Group[]).flatMap((g) =>
    [...sets[g]].map((id) => (
      <button key={`${g}:${id}`} className="ptoken" onClick={() => touch(g, id)}>
        {OPTS[g].find((o) => o.id === id)?.label ?? id}
        <Icon name="close" size={10} width={2.4} />
      </button>
    )),
  );

  const readyNames = ready.map((r) => r.p.name.replace(/ Prime$/, ''));
  const readyList = readyNames.length > 5 ? `${readyNames.slice(0, 5).join(' · ')} y ${readyNames.length - 5} más` : readyNames.join(' · ');

  return (
    <div className={`primes ${railOpen ? '' : 'rail-closed'}`}>
      {rail}

      <div className="stack pmain">
        <div className="pbar">
          <button className="pbar-filters" onClick={() => setDrawer(true)}>
            Filtros
            {active > 0 && <span className="n">{active}</span>}
          </button>
          <label className="search">
            <Icon name="search" size={15} width={1.7} />
            <input type="search" placeholder="Buscar prime…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>

          <div className="sortwrap" ref={sortRef}>
            <button
              className={`chip ${sortOpen ? 'is-on' : ''}`}
              onClick={() => setSortOpen((o) => !o)}
              aria-expanded={sortOpen}
              aria-haspopup="menu"
            >
              Orden · {activeSort.label}
              <Icon name={sort.dir === 'desc' ? 'down' : 'up'} size={11} width={2} />
            </button>
            {sortOpen && (
              <div className="sortmenu" role="menu">
                {SORTS.map((s) => {
                  const on = s.id === sort.key;
                  return (
                    <button
                      key={s.id}
                      role="menuitem"
                      className={on ? 'is-on' : ''}
                      onClick={() => {
                        setSort(s.id);
                        setSortOpen(false);
                      }}
                    >
                      {s.label}
                      {on && <Icon name={sort.dir === 'desc' ? 'down' : 'up'} size={11} width={2} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="seg" role="group" aria-label="Vista">
            <button className={view === 'cards' ? 'is-on' : ''} onClick={() => setView('cards')} aria-pressed={view === 'cards'}>
              Tarjetas
            </button>
            <button className={view === 'list' ? 'is-on' : ''} onClick={() => setView('list')} aria-pressed={view === 'list'}>
              Lista
            </button>
          </div>

          <span className="pcount n">
            {list.length} de {CATALOG.length}
          </span>
        </div>

        {/* Tokens: solo cuando el lateral no se ve (riel o móvil, vía CSS).
            Con el lateral abierto las casillas marcadas ya son el resumen. */}
        {active > 0 && (
          <div className="ptokens">
            {tokens}
            {q.trim() && (
              <button className="ptoken" onClick={() => setQ('')}>
                «{q.trim()}»
                <Icon name="close" size={10} width={2.4} />
              </button>
            )}
          </div>
        )}

        {/* Piezas listas ancladas: no deberían requerir un filtro para
            aparecer. Si no hay ninguno, la tira no se renderiza. */}
        {ready.length > 0 && (
          <div className="card pready">
            <Icon name="hammer" size={15} width={1.7} />
            <p>
              <b>
                {ready.length} con todas las piezas
              </b>{' '}
              — {readyList} — a la foundry{readyXp > 0 ? `, ${fmt(readyXp)} XP esperando` : ''}
            </p>
            <button className="chip chip--link" onClick={() => selectPreset('ready')}>
              ver solo esos
            </button>
          </div>
        )}

        {display.length === 0 ? (
          <div className="empty">
            {suggestion ? (
              <>
                <p>Ningún prime cumple estos filtros.</p>
                <p>
                  Quita <b>{suggestion.label}</b> y aparecen <b className="n">{suggestion.n}</b>.
                </p>
                <div className="empty-acts">
                  <button
                    className="chip chip--link"
                    onClick={() => (suggestion.group ? clearGroup(suggestion.group) : setQ(''))}
                  >
                    Quitar ese filtro
                  </button>
                  <button className="chip" onClick={clearAll}>
                    Limpiar todo
                  </button>
                </div>
              </>
            ) : (
              <>
                Sin resultados con estos filtros.{' '}
                <button className="chip chip--link" onClick={clearAll}>
                  Limpiar todo
                </button>
              </>
            )}
          </div>
        ) : view === 'cards' ? (
          <div className="pgrid">
            {display.map((row, i) => (
              <PrimeCard key={row.p.name} row={row} i={i} pinned={row.st === 'ready'} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <div className="plist">
            <div className="phead">
              <span />
              {th('name', 'ph-n')}
              {th('progress', 'ph-parts')}
              {th('status', 'ph-badge ph-status')}
              {th('acq', 'ph-badge ph-acq')}
              {th('release', 'ph-rel')}
              {th('xp', 'ph-xp')}
            </div>
            {display.map((row) => (
              <PrimeRow key={row.p.name} row={row} pinned={row.st === 'ready'} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
