import { addDays, key } from './dates';
import { SchoolHoliday, Zone } from './models';

const cache = new Map<number, Record<string, string>>();

/** Jours fériés de France métropolitaine pour une année (Pâques par l'algorithme de Meeus/Jones/Butcher). */
export function publicHolidays(y: number): Record<string, string> {
  const hit = cache.get(y);
  if (hit) return hit;
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(y, month - 1, day);
  const o: Record<string, string> = {};
  const put = (dt: Date, n: string) => { o[key(dt)] = n; };
  put(new Date(y, 0, 1), "Jour de l'An");
  put(addDays(easter, 1), 'Lundi de Pâques');
  put(new Date(y, 4, 1), 'Fête du Travail');
  put(new Date(y, 4, 8), 'Victoire 1945');
  put(addDays(easter, 39), 'Ascension');
  put(addDays(easter, 50), 'Lundi de Pentecôte');
  put(new Date(y, 6, 14), 'Fête nationale');
  put(new Date(y, 7, 15), 'Assomption');
  put(new Date(y, 10, 1), 'Toussaint');
  put(new Date(y, 10, 11), 'Armistice 1918');
  put(new Date(y, 11, 25), 'Noël');
  cache.set(y, o);
  return o;
}

export const publicHoliday = (k: string): string | null => publicHolidays(+k.slice(0, 4))[k] ?? null;

/** Nom de la période de vacances scolaires qui contient ce jour, pour la zone choisie (null si aucune). */
export function schoolHoliday(k: string, zone: Zone, periods: SchoolHoliday[]): string | null {
  if (zone === 'none') return null;
  for (const p of periods) if ((p.zone === 'ALL' || p.zone === zone) && k >= p.start && k <= p.end) return p.name;
  return null;
}
