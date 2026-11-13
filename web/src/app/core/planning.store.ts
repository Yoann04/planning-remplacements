import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { errorMessage } from './auth.interceptor';
import { publicHoliday, schoolHoliday } from './holidays';
import { Cabinet, Mutation, Note, Nurse, Planning, SchoolHoliday, Slot, WorkDay, Zone } from './models';
import { indexPlanning } from './rules';
import { UiState } from './ui.state';

const EMPTY: Planning = { user: { email: '', zone: 'A' }, cabinets: [], nurses: [], days: [], rests: [], notes: [] };
const DELETED: Cabinet = { id: '?', name: 'Cabinet supprimé', code: '?', color: '#3B82F6' };

/** Données du planning (signaux) et actions qui passent par l'API. */
@Injectable({ providedIn: 'root' })
export class PlanningStore {
  private api = inject(ApiService);
  private ui = inject(UiState);

  readonly planning = signal<Planning>(EMPTY);
  readonly holidays = signal<SchoolHoliday[]>([]);
  readonly loaded = signal(false);
  readonly loadError = signal('');
  /** Incrémenté à chaque changement : sert à recharger les compteurs de « Mon activité ». */
  readonly version = signal(0);

  readonly cabinets = computed(() => this.planning().cabinets);
  readonly nurses = computed(() => this.planning().nurses);
  readonly zone = computed<Zone>(() => this.planning().user.zone);
  private readonly index = computed(() => indexPlanning(this.planning()));
  private readonly cabById = computed(() => new Map(this.cabinets().map(c => [c.id, c])));
  private readonly nurseById = computed(() => new Map(this.nurses().map(n => [n.id, n])));

  cab = (id: string): Cabinet => this.cabById().get(id) ?? DELETED;
  nurse = (id: string | null): Nurse | undefined => (id ? this.nurseById().get(id) : undefined);
  nursesOf = (cabId: string | null) => this.nurses().filter(n => n.cabinetId === cabId);
  entries = (k: string): WorkDay[] => this.index().days.get(k) ?? [];
  rest = (k: string): Slot | null => this.index().rests.get(k)?.slot ?? null;
  ferie = (k: string) => publicHoliday(k);
  vacation = (k: string) => schoolHoliday(k, this.zone(), this.holidays());
  dayNotes = (k: string): Note[] => this.planning().notes.filter(n => n.scope === 'day' && n.date === k);
  cabNotes = (cabId: string): Note[] => this.planning().notes.filter(n => n.scope === 'cabinet' && n.cabinetId === cabId);
  nurseNotes = (nurseId: string): Note[] => this.planning().notes.filter(n => n.scope === 'nurse' && n.nurseId === nurseId);

  async load(): Promise<void> {
    this.loadError.set('');
    try {
      const [p, h] = await Promise.all([this.api.planning(), this.api.holidays()]);
      this.setPlanning(p);
      this.holidays.set(h);
      this.loaded.set(true);
    } catch (e) {
      this.loadError.set(errorMessage(e));
    }
  }

  reset(): void {
    this.planning.set(EMPTY);
    this.loaded.set(false);
  }

  /**
   * Lance une modification. En cas de succès : planning mis à jour et message avec « Annuler ».
   * En cas d'échec : le message d'erreur est renvoyé (affiché dans la fenêtre) ou montré en bas d'écran.
   */
  async run(call: () => Promise<Mutation>, message: (r: Mutation) => string | null, opts: { inline?: boolean } = {}): Promise<{ ok: boolean; error?: string; result?: Mutation }> {
    try {
      const r = await call();
      this.setPlanning(r.planning);
      const msg = message(r);
      if (msg) this.ui.toast(msg, r.undoId ?? null);
      return { ok: true, result: r };
    } catch (e) {
      const error = errorMessage(e);
      if (!opts.inline) this.ui.toast(error);
      return { ok: false, error };
    }
  }

  async undo(id: string): Promise<void> {
    this.ui.hideToast();
    await this.run(() => this.api.undo(id), () => 'Modification annulée');
  }

  private setPlanning(p: Planning): void {
    this.planning.set(p);
    this.version.update(v => v + 1);
  }
}
