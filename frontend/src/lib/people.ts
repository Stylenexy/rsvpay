import type { Lang } from '../hero/copy';

/** Who the examples are about. Indonesian readers meet Siti and Budi; everyone else meets names that travel. */
export function people(lang: Lang) {
  return lang === 'id'
    ? { host: 'Siti', guest: 'Budi', couple: 'Siti & Andi', second: 'Budi & Rina', wish: 'Selamat berbahagia' }
    : { host: 'Maya', guest: 'Sam', couple: 'Maya & Leo', second: 'Sam & Nina', wish: 'To a lifetime of happy days' };
}
