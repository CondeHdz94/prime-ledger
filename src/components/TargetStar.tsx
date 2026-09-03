import { useStore } from '../lib/store';

/* La misma mira de Icon.tsx; encendida lleva el centro relleno. Era una
   estrella, pero la estrella dice «favorito» — una preferencia — y esto es un
   objetivo activo que se quita al conseguirlo: todo el vocabulario alrededor
   («en la mira», «lo que estás buscando», «ruta») es de cacería. */
const TARGET = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 2v4M12 18v4M2 12h4M18 12h4';

/**
 * Marca un ítem como "lo estoy cazando ahora". Un prime sale en la sección 00
 * del panel con la ruta completa; un arma normal sale ahí con su rango, y
 * gana el escalón «sube» de la próxima sesión. Solo icono en los cuatro
 * sitios (tarjeta, fila, cajón, sección 00): el mismo glifo se aprende una
 * vez, y donde todo está en la mira el texto sobraba. (El nombre del
 * componente y la clase `.star` son herencia del icono anterior.)
 */
export function TargetStar({
  name,
  size = 16,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const { progress, dispatch } = useStore();
  const on = !!progress.targets[name];

  return (
    <button
      className={`star ${on ? 'is-on' : ''} ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: 'toggleTarget', name });
      }}
      aria-pressed={on}
      title={on ? `Sacar ${name} de la mira` : `Poner ${name} en la mira`}
      aria-label={on ? `Sacar ${name} de la mira` : `Cazar ${name}`}
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
    </button>
  );
}
