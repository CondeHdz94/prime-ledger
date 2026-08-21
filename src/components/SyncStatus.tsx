import { useStore } from '../lib/store';
import { lastSync } from '../lib/selectors';
import { daysSince } from '../lib/dates';

/**
 * Qué tan viejo es el dato del panel.
 *
 * Las secciones 01, 03 y 04 salen del último `lastData.dat`, así que entre
 * sincronizaciones el panel deriva sin avisar: te sigue recomendando abrir
 * reliquias que ya gastaste. Esto es la señal para saber cuándo desconfiar.
 */
export function SyncStatus() {
  const { progress } = useStore();
  const at = lastSync(progress);

  if (!at) {
    return (
      <span className="syncst is-warn" title="El panel aún no sabe qué tienes en el juego">
        sin sincronizar
      </span>
    );
  }

  const days = daysSince(at);
  const label = days <= 0 ? 'sincronizado hoy' : days === 1 ? 'sincronizado ayer' : `hace ${days} días`;
  // A la semana el inventario ya no se parece al del archivo.
  const stale = days >= 7;

  return (
    <span
      className={`syncst ${stale ? 'is-warn' : ''}`}
      title={`Última sincronización con AlecaFrame: ${new Date(at).toLocaleString('es-CO')}`}
    >
      {label}
    </span>
  );
}
