import { useState } from 'react';
import { StoreProvider, useStore } from './lib/store';
import { Today } from './views/Today';
import { Primes } from './views/Primes';
import { Mastery } from './views/Mastery';
import { History } from './views/History';
import { PrimeDetail } from './views/PrimeDetail';
import { SyncButton } from './components/SyncButton';
import { SyncStatus } from './components/SyncStatus';
import { Icon } from './components/Icon';
import { fmt, mrGoal, totalXp } from './lib/mastery';
import { DATA, MASTERY_GEAR, PRIMES } from './lib/gameData';
import './app.css';

type Tab = 'hoy' | 'primes' | 'mastery' | 'history';

const TABS: { id: Tab; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'primes', label: 'Primes' },
  { id: 'mastery', label: 'Maestría' },
  { id: 'history', label: 'Registro' },
];

/** El hash sigue siendo `#tab` o `#tab/Nombre Prime`; `#panel` viejo redirige a `#hoy`. */
function initialFromHash(): { tab: Tab; prime: string | null } {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  const [t, prime] = h.split('/');
  const id = t === 'panel' ? 'hoy' : t;
  const tab = (TABS.some((x) => x.id === id) ? id : 'hoy') as Tab;
  return { tab, prime: prime || null };
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
  const [openPrime, setOpenPrime] = useState<string | null>(() => initialFromHash().prime);

  const setTab = (t: Tab) => {
    setTabState(t);
    history.replaceState(null, '', `#${t}`);
  };

  const xp = totalXp(progress);
  const { mr, goal, pct } = mrGoal(xp);
  const detail = openPrime ? PRIMES.find((p) => p.name === openPrime) : undefined;

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
              catálogo del juego al {DATA.builtAt.slice(0, 10)} · {PRIMES.length} primes · {MASTERY_GEAR.length} equipos
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
        {tab === 'hoy' && <Today onOpenPrime={setOpenPrime} />}
        {tab === 'primes' && <Primes onOpen={setOpenPrime} />}
        {tab === 'mastery' && <Mastery />}
        {tab === 'history' && <History />}
      </main>

      {/* El cajón vive en el shell, no dentro de una pestaña: se abre encima
          de donde estés y al cerrarlo sigues en tu sitio. */}
      {detail && <PrimeDetail prime={detail} onClose={() => setOpenPrime(null)} />}
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
