/** Types échangés avec l'API (voir api/src/Entity/*::toArray()). */
export type Slot = 'full' | 'am' | 'pm';
export type Zone = 'A' | 'B' | 'C' | 'none';
export type NoteScope = 'day' | 'cabinet' | 'nurse';

/** active = false : cabinet « en veille » (remplacement terminé), absent des choix d'ajout ; ses jours restent. */
export interface Cabinet { id: string; name: string; code: string; color: string; active: boolean }
export interface Nurse { id: string; cabinetId: string; name: string }
export interface WorkDay { id: string; date: string; cabinetId: string; nurseId: string | null; slot: Slot }
export interface Rest { id: string; date: string; slot: Slot }
export interface Note { id: string; scope: NoteScope; date: string | null; cabinetId: string | null; nurseId: string | null; text: string }

export interface Planning {
  user: { email: string; zone: Zone };
  cabinets: Cabinet[];
  nurses: Nurse[];
  days: WorkDay[];
  rests: Rest[];
  notes: Note[];
}

export interface SchoolHoliday { zone: 'ALL' | 'A' | 'B' | 'C'; name: string; start: string; end: string }

/** Réponse des actions qui modifient le planning : résultat + planning complet à jour + identifiant d'annulation. */
export interface Mutation {
  planning: Planning;
  undoId?: string | null;
  [key: string]: unknown;
}

export interface Stats {
  from: string;
  to: string;
  today: string;
  days: { total: number; done: number; todo: number };
  rests: { done: number; todo: number };
  cabinets: Record<string, { total: number; done: number; todo: number; nurses: Record<string, number> }>;
  months: Record<string, number>;
}
