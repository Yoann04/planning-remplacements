import { key, todayKey } from './dates';
import { Cabinet, Note, Planning, Rest, Slot, WorkDay } from './models';

/** Règles et calculs du planning (mêmes règles que l'API, utilisées pour l'affichage). Fonctions pures. */
export const SLOT_LABEL: Record<Slot, string> = { full: 'Journée', am: 'Matin', pm: 'Après-midi' };
export const SLOT_ORDER: Record<Slot, number> = { full: 0, am: 1, pm: 2 };

/** Journée = 1 jour, demi-journée = 0,5. */
export const slotValue = (s: Slot) => (s === 'full' ? 1 : 0.5);
/** Deux périodes se chevauchent si l'une est la journée entière ou si elles sont identiques. */
export const overlaps = (a: Slot, b: Slot) => a === 'full' || b === 'full' || a === b;
/** Un repos sur cette période est-il impossible à cause des cabinets déjà présents ce jour-là ? */
export const restClash = (entries: WorkDay[], rest: Slot) => entries.some(e => overlaps(e.slot, rest));
/** Ajouter un cabinet sur cette période retire-t-il le repos du jour ? */
export const entryClash = (rest: Slot | null, slot: Slot) => !!rest && overlaps(rest, slot);

export const restText = (r: Slot) => (r === 'am' ? 'Repos voulu · matin' : r === 'pm' ? 'Repos voulu · après-midi' : 'Repos voulu');
export const num = (n: number) => String(n).replace('.', ',');
export const jours = (t: number) => `${num(t)} jour${t >= 2 ? 's' : ''}`;
export const plural = (n: number, word: string) => `${num(n)} ${word}${n >= 2 ? 's' : ''}`;
export const sortEntries = (es: WorkDay[]) => es.slice().sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);

/** Index par date, recalculé quand le planning change. */
export interface Index {
  days: Map<string, WorkDay[]>;
  rests: Map<string, Rest>;
}
export function indexPlanning(p: Planning): Index {
  const days = new Map<string, WorkDay[]>();
  for (const d of p.days) {
    const l = days.get(d.date);
    if (l) l.push(d); else days.set(d.date, [d]);
  }
  for (const [k, l] of days) days.set(k, sortEntries(l));
  return { days, rests: new Map(p.rests.map(r => [r.date, r])) };
}

/** Jours au total / faits (jusqu'à aujourd'hui inclus) / prévus, entre deux dates incluses. */
export function dayTotals(days: WorkDay[], from: string, to: string, today = todayKey()) {
  let total = 0, done = 0;
  for (const d of days) {
    if (d.date < from || d.date > to) continue;
    const v = slotValue(d.slot);
    total += v;
    if (d.date <= today) done += v;
  }
  return { total, done, todo: total - done };
}

/** Initiales proposées à partir du nom : « Cabinet des Lilas » → « LI », « Saint-Roch » → « SR ». */
export function autoCode(name: string): string {
  const stop = new Set(['cabinet', 'des', 'du', 'de', 'la', 'les', 'le', 'l', 'd', 'et', 'infirmier', 'infirmiers', 'infirmière', 'infirmières']);
  const words = name.toLowerCase().split(/[^\p{L}]+/u).filter(w => w && !stop.has(w));
  const ascii = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  if (!words.length) return '';
  return ascii(words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]);
}

/** Palette de couleurs proposée pour les cabinets (plus « Autre couleur » libre). */
export const PALETTE = [
  '#E5484D', '#F76B15', '#F5A524', '#E5C400', '#5BB318', '#12A594', '#00A2C7', '#3B82F6',
  '#4F46E5', '#8E4EC6', '#D6409F', '#B42318', '#C2410C', '#B7791F', '#8A7A00', '#3F7D20',
  '#0B7A6C', '#0E7490', '#1D4ED8', '#3730A3', '#6B21A8', '#9D174D', '#7C2D12', '#1F2937',
  '#FF8E8E', '#FFB26B', '#FFD166', '#C5DD6B', '#7ED9A0', '#6FD3C9', '#7CC7EF', '#8FB4FF',
  '#A9A2FF', '#C9A5F2', '#F1A3D2', '#A8A29E', '#64748B', '#78716C', '#334155'];

/** Première couleur de la palette pas encore utilisée par un cabinet. */
export function freeColor(cabs: Cabinet[]): string {
  const used = new Set(cabs.map(c => c.color.toLowerCase()));
  return PALETTE.slice(0, 12).find(x => !used.has(x.toLowerCase())) ?? PALETTE[cabs.length % PALETTE.length];
}

export const sameDay = (a: Date, b: Date) => key(a) === key(b);

/**
 * Pense-bêtes d'un cabinet : d'abord ceux du cabinet, puis ceux de ses infirmières (dans l'ordre des infirmières),
 * chacun avec le nom de l'infirmière concernée (null pour le cabinet).
 */
export function cabinetNotes(p: Pick<Planning, 'nurses' | 'notes'>, cabId: string): (Note & { nurseName: string | null })[] {
  const out: (Note & { nurseName: string | null })[] = p.notes.filter(n => n.scope === 'cabinet' && n.cabinetId === cabId).map(n => ({ ...n, nurseName: null }));
  for (const nu of p.nurses.filter(x => x.cabinetId === cabId)) {
    out.push(...p.notes.filter(n => n.scope === 'nurse' && n.nurseId === nu.id).map(n => ({ ...n, nurseName: nu.name })));
  }
  return out;
}

/**
 * Cabinets proposés pour ajouter un jour : les cabinets actifs. Un cabinet en veille n'est gardé que s'il est
 * déjà celui du jour qu'on modifie (keepId), pour pouvoir modifier ce jour sans le changer de cabinet.
 */
export function addChoices(cabs: Cabinet[], keepId: string | null = null): Cabinet[] {
  return cabs.filter(c => c.active || c.id === keepId);
}

/** Légende du calendrier : les cabinets (actifs ou en veille) qui ont au moins un jour dans la période visible. */
export function legendCabinets(cabs: Cabinet[], days: WorkDay[], from: string, to: string): Cabinet[] {
  const used = new Set(days.filter(d => d.date >= from && d.date <= to).map(d => d.cabinetId));
  return cabs.filter(c => used.has(c.id));
}

/** Jours encore prévus (après aujourd'hui) dans un cabinet, en jours (demi-journée = 0,5). */
export function futureDays(days: WorkDay[], cabId: string, today = todayKey()): number {
  return days.filter(d => d.cabinetId === cabId && d.date > today).reduce((s, d) => s + slotValue(d.slot), 0);
}
