import { useState } from 'react';
import { StoreProvider, useStore } from './lib/store';
import { Today } from './views/Today';
import { Primes } from './views/Primes';
import { Mastery } from './views/Mastery';
import { History } from './views/History';
import { PrimeDetail } from './views/PrimeDetail';
import { GearDetail } from './views/GearDetail';
import { SyncButton } from './components/SyncButton';
import { SyncStatus } from './components/SyncStatus';
import { Icon } from './components/Icon';
import { fmt, mrGoal, totalXp } from './lib/mastery';
import { DATA, MASTERY_GEAR, PRIMES } from './lib/gameData';
import { CATALOG } from './lib/primeFilters';
import './app.css';

type Tab = 'hoy' | 'primes' | 'mastery' | 'history';

const TABS: { id: Tab; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'primes', label: 'Primes' },
  { id: 'mastery', label: 'Maestría' },
  { id: 'history', label: 'Registro' },
];

/** El hash sigue siendo `#tab` o `#tab/Nombre del ítem`; `#panel` viejo redirige a `#hoy`. */
function initialFromHash(): { tab: Tab; item: string | null } {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  const [t, item] = h.split('/');
  const id = t === 'panel' ? 'hoy' : t;
  const tab = (TABS.some((x) => x.id === id) ? id : 'hoy') as Tab;
  return { tab, item: item || null };
}

/** Anillo de progreso hacia el rango objetivo. */
function Ring({ pct }: { pct: number }) {
  const C = 94.2; // 2πr con r = 15
  return (
    <svg width={34} height={34} viewBox="0 0 34 34" aria-hidden>
      <circle cx="17" cy="17" r="15" fill="none" stroke="var(--line)" strokeWidth="2.5" />
      <circle
        cx="17"
        cy="17"
        r="15"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${((pct / 100) * C).toFixed(1)} ${C}`}
        transform="rotate(-90 17 17)"
      />
    </svg>
  );
}

function Shell() {
  const { progress } = useStore();
  const [tab, setTabState] = useState<Tab>(() => initialFromHash().tab);
  // Un solo «ítem abierto» para primes y equipo normal: el nombre decide qué
  // cajón se pinta, y las vistas no tienen que saber cuál de los dos es.
  const [openItem, setOpenItem] = useState<string | null>(() => initialFromHash().item);

  const setTab = (t: Tab) => {
    setTabState(t);
    history.replaceState(null, '', `#${t}`);
  };

  const xp = totalXp(progress);
  const { mr, goal, pct } = mrGoal(xp);
  const detailPrime = openItem ? PRIMES.find((p) => p.name === openItem) : undefined;
  const detailGear = openItem && !detailPrime ? MASTERY_GEAR.find((g) => g.name === openItem) : undefined;

  return (
    <div className="shell">
      <header className="hdr">
        <div className="brand">
          <span className="mark">
            <Icon name="relic" size={19} color="var(--gold)" width={1.4} />
          </span>
          <div>
            <h1>
              Prime <em>Ledger</em>
            </h1>
            <p>
              {/* CATALOG, no PRIMES: el mismo 167 que muestra la pestaña —
                  los tres de Founders no cuentan en ningún sitio */}
              catálogo del juego al {DATA.builtAt.slice(0, 10)} · {CATALOG.length} primes · {MASTERY_GEAR.length} equipos
            </p>
          </div>
        </div>

        <nav className="tabs" aria-label="Secciones">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'is-on' : ''}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="hdr-r">
          <span className="syncbox">
            <SyncButton />
            <SyncStatus />
          </span>
          <div className="mrpill" title={`${fmt(xp)} XP acumulados`}>
            <Ring pct={pct} />
            <div>
              <b className="n">MR {mr}</b>
              <span className="n">
                {Math.floor(pct)}% a {goal > 30 ? `LR${goal - 30}` : 'MR30'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main>
        {tab === 'hoy' && <Today onOpenItem={setOpenItem} />}
        {tab === 'primes' && <Primes onOpen={setOpenItem} />}
        {tab === 'mastery' && <Mastery onOpen={setOpenItem} />}
        {tab === 'history' && <History />}
      </main>

      {/* El cajón vive en el shell, no dentro de una pestaña: se abre encima
          de donde estés y al cerrarlo sigues en tu sitio. */}
      {detailPrime && <PrimeDetail prime={detailPrime} onClose={() => setOpenItem(null)} />}
      {detailGear && <GearDetail item={detailGear} onClose={() => setOpenItem(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
