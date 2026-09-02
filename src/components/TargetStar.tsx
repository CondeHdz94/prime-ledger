import { useStore } from '../lib/store';

const STAR = 'm12 3 2.7 5.9 6.3.7-4.7 4.3 1.3 6.4L12 17l-5.6 3.3 1.3-6.4L3 9.6l6.3-.7z';

/**
 * Marca un prime como "lo estoy buscando ahora". Sale en la sección 00 del
 * panel con la ruta completa para conseguirlo.
 */
export function TargetStar({
  primeName,
  size = 16,
  className = '',
  label = false,
}: {
  primeName: string;
  size?: number;
  className?: string;
  /** con texto («Seguir» / «Siguiendo»): un icono solo al 35 % de opacidad era
   *  la palanca que alimenta la sección 00 y lo menos visible de la tarjeta */
  label?: boolean;
}) {
  const { progress, dispatch } = useStore();
  const on = !!progress.targets[primeName];

  return (
    <button
      className={`star ${label ? 'star--label' : ''} ${on ? 'is-on' : ''} ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: 'toggleTarget', primeName });
      }}
      aria-pressed={on}
      title={on ? `Dejar de buscar ${primeName}` : `Marcar ${primeName} como objetivo actual`}
      aria-label={on ? `Dejar de buscar ${primeName}` : `Buscar ${primeName}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={on ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={STAR} />
      </svg>
      {label && <span>{on ? 'Siguiendo' : 'Seguir'}</span>}
    </button>
  );
}
