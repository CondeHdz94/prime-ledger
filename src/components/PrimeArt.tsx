import { useState } from 'react';
import { CDN_IMG } from '../lib/gameData';
import { CatIcon } from './Icon';

/**
 * Arte oficial del prime desde el CDN de Warframe. Si no carga —sin red, o
 * un `image` que el catálogo no trae— cae al glifo de su categoría.
 *
 * Las clases van por separado porque la imagen y el glifo se pintan distinto:
 * el glifo vive en una caja con fondo y borde, la imagen va suelta.
 */
export function PrimeArt({
  image,
  category,
  size = 22,
  imgClass,
  glyphClass,
}: {
  image?: string;
  category: string;
  size?: number;
  imgClass: string;
  glyphClass: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = CDN_IMG(image);

  if (!src || failed) {
    return (
      <span className={glyphClass}>
        <CatIcon cat={category} size={size} />
      </span>
    );
  }
  return <img className={imgClass} src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
}
