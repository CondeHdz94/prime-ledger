/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { Extras, HistoryEvent, Progress } from '../types';
import { EMPTY_PROGRESS } from '../types';
import { MASTERY_GEAR } from './gameData';

const LS_KEY = 'prime-tracker:v1';

type Action =
  | { type: 'setPart'; fullName: string; owned: number; max: number; primeName: string }
  | { type: 'setBuilt'; primeName: string; built: boolean }
  | { type: 'setMastered'; itemName: string; mastered: boolean }
  | { type: 'setExtra'; key: keyof Extras; value: number }
  | { type: 'note'; label: string }
  | { type: 'importProgress'; progress: Progress }
  | { type: 'reset' };

const ev = (kind: HistoryEvent['kind'], label: string, xp?: number): HistoryEvent => ({
  t: new Date().toISOString(),
  kind,
  label,
  ...(xp !== undefined ? { xp } : {}),
});

const gearXpOf = (name: string) => MASTERY_GEAR.find((g) => g.name === name)?.xp;

function reducer(state: Progress, action: Action): Progress {
  switch (action.type) {
    case 'setPart': {
      const owned = Math.max(0, Math.min(action.owned, action.max));
      const prev = state.parts[action.fullName] ?? 0;
      if (owned === prev) return state;
      const dir = owned > prev ? '+' : '−';
      return {
        ...state,
        parts: { ...state.parts, [action.fullName]: owned },
        history: [...state.history, ev('part', `${dir} ${action.fullName} (${owned}/${action.max})`)],
      };
    }
    case 'setBuilt': {
      if (!!state.built[action.primeName] === action.built) return state;
      return {
        ...state,
        built: { ...state.built, [action.primeName]: action.built },
        history: action.built
          ? [...state.history, ev('built', `Construido: ${action.primeName}`)]
          : state.history,
      };
    }
    case 'setMastered': {
      if (!!state.mastered[action.itemName] === action.mastered) return state;
      const xp = gearXpOf(action.itemName);
      return {
        ...state,
        mastered: { ...state.mastered, [action.itemName]: action.mastered },
        history: [
          ...state.history,
          action.mastered
            ? ev('mastered', `Masterizado: ${action.itemName}`, xp)
            : ev('unmastered', `Desmarcado: ${action.itemName}`, xp !== undefined ? -xp : undefined),
        ],
      };
    }
    case 'setExtra': {
      const value = Math.max(0, action.value);
      if (state.extras[action.key] === value) return state;
      return { ...state, extras: { ...state.extras, [action.key]: value } };
    }
    case 'note':
      return { ...state, history: [...state.history, ev('note', action.label)] };
    case 'importProgress':
      return {
        ...action.progress,
        history: [...action.progress.history, ev('import', 'Progreso importado desde archivo')],
      };
    case 'reset':
      return { ...EMPTY_PROGRESS, history: [ev('note', 'Registro reiniciado')] };
    default:
      return state;
  }
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Progress;
    if (parsed.v !== 1) return EMPTY_PROGRESS;
    return { ...EMPTY_PROGRESS, ...parsed, extras: { ...EMPTY_PROGRESS.extras, ...parsed.extras } };
  } catch {
    return EMPTY_PROGRESS;
  }
}

interface Store {
  progress: Progress;
  dispatch: React.Dispatch<Action>;
  exportJson: () => void;
  importJson: (file: File) => Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [progress, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(progress));
  }, [progress]);

  const store = useMemo<Store>(
    () => ({
      progress,
      dispatch,
      exportJson: () => {
        const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `prime-tracker-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      importJson: async (file: File) => {
        const text = await file.text();
        const parsed = JSON.parse(text) as Progress;
        if (parsed.v !== 1 || typeof parsed.parts !== 'object') {
          throw new Error('Archivo no válido');
        }
        dispatch({ type: 'importProgress', progress: { ...EMPTY_PROGRESS, ...parsed } });
      },
    }),
    [progress],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore fuera de StoreProvider');
  return ctx;
}
