import { useState } from 'react';
import { StoreProvider, useStore } from './lib/store';
import { Dashboard } from './views/Dashboard';
import { Primes } from './views/Primes';
import { Mastery } from './views/Mastery';
import { History } from './views/History';
import { fmt, mrFromXp, totalXp } from './lib/mastery';
import { DATA } from './lib/gameData';
import './app.css';

type Tab = 'panel' | 'primes' | 'mastery' | 'history';

const TABS: { id: Tab; label: string }[] = [
  { id: 'panel', label: 'Panel' },
  { id: 'primes', label: 'Primes' },
  { id: 'mastery', label: 'Maestría' },
  { id: 'history', label: 'Historial' },
];

function initialFromHash(): { tab: Tab; prime: string | null } {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  const [t, prime] = h.split('/');
  const tab = (TABS.some((x) => x.id === t) ? t : 'panel') as Tab;
  return { tab, prime: prime || null };
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

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>Prime <em>Ledger</em></h1>
          <span>
            registro del inventario · data {DATA.builtAt.slice(0, 10)}
          </span>
        </div>
        <div className="topbar-mr">
          <span className="label">Mastery</span>
          <span className="mr-big num">MR {mrFromXp(xp)}</span>
          <span className="label num">{fmt(xp)} XP</span>
        </div>
      </header>

      <nav className="tabs" aria-label="Secciones">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'panel' && (
        <Dashboard
          onOpenPrime={(name) => {
            setTab('primes');
            setOpenPrime(name);
          }}
        />
      )}
      {tab === 'primes' && (
        <Primes openPrime={openPrime} onOpen={setOpenPrime} onClose={() => setOpenPrime(null)} />
      )}
      {tab === 'mastery' && <Mastery />}
      {tab === 'history' && <History />}
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
