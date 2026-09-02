/**
 * Iconografía de trazo — rejilla 24, un solo grosor, sin emoji.
 * `cat` son los glifos por categoría: se usan como respaldo cuando el
 * arte del CDN no carga y en las filas donde no hay imagen.
 */

const PATHS = {
  relic: 'M12 2.5 21 12l-9 9.5L3 12Z M12 7.2 16.6 12 12 16.8 7.4 12Z',
  sync: 'M21 12a9 9 0 0 1-9 9 9 9 0 0 1-8.2-5.3 M3 12a9 9 0 0 1 9-9 9 9 0 0 1 8.2 5.3 M20.5 3.5v4.8h-4.8 M3.5 20.5v-4.8h4.8',
  check: 'M20 6 9 17l-5-5',
  alert: 'M12 8v5 M12 16.4v.1 M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 11v5 M12 7.6v.1',
  chevron: 'm9 6 6 6-6 6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M20 20l-3.5-3.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  /* martillo de verdad: cabeza maciza arriba-derecha y mango en diagonal —
     el path anterior era una copia del glifo-espada de Melee y leía como lápiz */
  hammer:
    'M15 12 6.6 20.4a1.7 1.7 0 1 1-3-3L12 9 M21.5 11.5 19.6 9.6A2 2 0 0 1 19 8.2V7l-2.3-2.3a6 6 0 0 0-4.2-1.7L9 3l.9.8A6.2 6.2 0 0 1 12 8.4V10l2 2h1.2a2 2 0 0 1 1.4.6l1.9 1.9 3-3Z',
  /* mira: círculo y cuatro marcas que cruzan el borde — «en la mira» */
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 2v4M12 18v4M2 12h4M18 12h4',
  note: 'M5 4h14v16l-4-3H5Z M9 9h6M9 13h4',
  down: 'M12 4v13m0 0-5-5m5 5 5-5 M4 20h16',
  up: 'M12 20V7m0 0-5 5m5-5 5 5 M4 4h16',
  /* el sigil de maestría del juego: rombo sobre chevrones ascendentes */
  mastery: 'M12 2.8 14.4 5.4 12 8 9.6 5.4Z M5 14.2 12 9.6l7 4.6 M5 20 12 15.4 19 20',
} as const;

const CAT: Record<string, string> = {
  Warframes: 'M12 2.5c4.1 0 6.8 2.7 6.8 6.7 0 4.6-2.5 8.4-6.8 12.3C7.7 17.6 5.2 13.8 5.2 9.2c0-4 2.7-6.7 6.8-6.7Z M9 9.6 12 7l3 2.6 M10 14h4',
  Primary: 'M2.5 10.5h12l2.5 2.5h6.5 M14.5 10.5V8h4.5 M6.5 13v3.5 M10.5 13v2',
  Secondary: 'M4 8.5h11.5v4H12l-2 4.5H6.5l1.2-4.5H4z M15.5 8.5V6.5h3',
  Melee: 'M13.5 3 21 10.5 9.5 22H4v-5.5z M12 5.5l6.5 6.5',
  Sentinels: 'M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z M3 12h2 M19 12h2',
  Pets: 'M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z M3 12h2 M19 12h2',
  Archwing: 'M12 4v16 M12 8 3 12l9 4 9-4-9-4Z',
  'Arch-Gun': 'M2.5 10.5h12l2.5 2.5h6.5 M14.5 10.5V8h4.5 M6.5 13v3.5',
  'Arch-Melee': 'M13.5 3 21 10.5 9.5 22H4v-5.5z M12 5.5l6.5 6.5',
  Necramech: 'M6 4h12v7l-3 3v6H9v-6l-3-3Z M9.5 7.5h5',
  Railjack: 'M12 3 20 12l-8 9-8-9Z M12 8v8',
  Misc: 'M12 3 20 12l-8 9-8-9Z',
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 16,
  color = 'currentColor',
  width = 1.5,
  className,
}: {
  name: IconName;
  size?: number;
  color?: string;
  width?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Glifo por categoría de equipo. */
export function CatIcon({ cat, size = 22 }: { cat: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={CAT[cat] ?? CAT.Misc} />
    </svg>
  );
}
