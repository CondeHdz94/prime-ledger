import { useStore } from '../lib/store';

/* La misma mira de Icon.tsx; encendida lleva el centro relleno. Era una
   estrella, pero la estrella dice «favorito» — una preferencia — y esto es un
   objetivo activo que se quita al conseguirlo: todo el vocabulario alrededor
   («en la mira», «lo que estás buscando», «ruta») es de cacería. */
const TARGET = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 2v4M12 18v4M2 12h4M18 12h4';

/**
 * Marca un prime como "lo estoy cazando ahora". Sale en la sección 00 del
 * panel con la ruta completa para conseguirlo. (El nombre del componente y la
 * clase `.star` son herencia del icono anterior.)
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
  /** con texto («Cazar» / «En la mira»): un icono solo al 35 % de opacidad era
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
      title={on ? `Sacar ${primeName} de la mira` : `Poner ${primeName} en la mira`}
      aria-label={on ? `Sacar ${primeName} de la mira` : `Cazar ${primeName}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={TARGET} />
        {on && <circle cx={12} cy={12} r={2.2} fill="currentColor" stroke="none" />}
      </svg>
      {label && <span>{on ? 'En la mira' : 'Cazar'}</span>}
    </button>
  );
}
