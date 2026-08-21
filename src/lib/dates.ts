/**
 * Los eventos se guardan en ISO/UTC, pero el "día" que le importa a un Tenno
 * es el suyo. Con `t.slice(0, 10)` una sesión de las 8 de la noche en Colombia
 * (UTC−5) cae en el día siguiente: el registro la agrupa mal y la sección 04
 * la retiraría antes de tiempo.
 */
export function dayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** El día local de hoy, en el mismo formato que `dayKey`. */
export const today = () => dayKey(new Date());

/**
 * Días completos entre dos fechas, contando de medianoche local a medianoche
 * local: algo de anoche a las 23:00 es "ayer", no "hace 0 días".
 */
export function daysSince(iso: string, from: Date = new Date()): number {
  const a = new Date(iso);
  const d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const d2 = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  return Math.round((d2 - d1) / 86_400_000);
}
