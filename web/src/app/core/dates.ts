/** Dates locales manipulées sous forme de clés « AAAA-MM-JJ » (comme l'API). Fonctions pures. */
export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MS = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
export const DOW = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const DOW3 = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Jour de la semaine, lundi = 0. */
export const dow = (d: Date) => (d.getDay() + 6) % 7;
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const todayKey = () => key(new Date());
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 864e5 + 1) / 7);
}

export const dayLabel = (k: string) => { const d = parseKey(k); return `${DOW[dow(d)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const mabbr = (d: Date) => MS[d.getMonth()].toLowerCase();

export function fmtRange(a: string, b: string): string {
  const da = parseKey(a), db = parseKey(b);
  if (da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear()) return `${da.getDate()} au ${db.getDate()} ${mabbr(db)}`;
  return `${da.getDate()} ${mabbr(da)} au ${db.getDate()} ${mabbr(db)}`;
}

/** « 3, 4 et 5 nov. » ou « du 1 au 20 nov. (20 jours) » au-delà de 8 jours. */
export function listDates(keys: string[]): string {
  const ks = keys.slice().sort(), n = ks.length;
  if (n > 8) return `du ${fmtRange(ks[0], ks[n - 1])} (${n} jours)`;
  const groups = new Map<string, { d: Date; days: number[] }>();
  for (const k of ks) {
    const d = parseKey(k), m = `${d.getFullYear()}-${d.getMonth()}`;
    if (!groups.has(m)) groups.set(m, { d, days: [] });
    groups.get(m)!.days.push(d.getDate());
  }
  return [...groups.values()].map(({ d, days }) =>
    (days.length > 1 ? days.slice(0, -1).join(', ') + ' et ' + days[days.length - 1] : String(days[0])) + ' ' + mabbr(d)).join(' · ');
}

/** Toutes les clés entre a et b inclus (dans l'ordre). */
export function rangeKeys(a: string, b: string): string[] {
  if (a > b) [a, b] = [b, a];
  const out: string[] = [];
  for (let d = parseKey(a); key(d) <= b; d = addDays(d, 1)) out.push(key(d));
  return out;
}

export const monthRange = (d: Date): [string, string] => {
  const p = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  return [`${p}-01`, `${p}-${pad(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())}`];
};
export const yearRange = (d: Date): [string, string] => [`${d.getFullYear()}-01-01`, `${d.getFullYear()}-12-31`];
