import { useRef, useState } from 'react';
import { parseLastData } from '../lib/aleca';
import { useStore } from '../lib/store';
import { Icon } from './Icon';

/**
 * Importar el `lastData.dat` de AlecaFrame es lo que hace útil el tracker,
 * así que vive en la cabecera y no enterrado dentro de una pestaña.
 * El mismo componente se reutiliza en Registro con `variant="full"`.
 */
export function SyncButton({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  const { dispatch } = useStore();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const result = await parseLastData(file);
      const s = result.summary;
      const ok = confirm(
        `Inventario leído (MR en juego: ${s.mrInGame ?? '?'}).\n` +
          `· ${s.partsFound} piezas prime sueltas\n` +
          `· ${s.primesBuilt} primes en tu arsenal\n` +
          `· ${s.gearOwned} ítems masterizables que ya tienes\n` +
          `· ${s.itemsMastered} ítems masterizados\n` +
          `· ${s.relicCount} reliquias en inventario\n` +
          `· ${s.starChartNodes} nodos star chart + ${s.steelPathNodes} Steel Path\n\n` +
          `¿Aplicar al tracker? (reemplaza piezas/maestría; el historial se conserva)`,
      );
      if (ok) dispatch({ type: 'importAleca', result });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo leer el archivo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className={`btn btn--gold ${variant === 'compact' ? 'btn--sm' : ''}`}
        onClick={() => ref.current?.click()}
        disabled={busy}
        title="Importar lastData.dat de AlecaFrame — se procesa en tu navegador, nada sale de tu máquina"
      >
        <Icon name="sync" size={variant === 'compact' ? 14 : 15} />
        {busy ? 'Leyendo…' : variant === 'compact' ? 'Sincronizar' : 'Sincronizar AlecaFrame'}
      </button>
      <input
        ref={ref}
        type="file"
        accept=".dat"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await onFile(f);
          e.target.value = '';
        }}
      />
    </>
  );
}
