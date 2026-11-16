import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Actions } from '../core/actions';
import { cap, dayLabel, listDates } from '../core/dates';
import { PlanningStore } from '../core/planning.store';
import { UiState } from '../core/ui.state';
import { PickState, Pickers } from '../shared/pickers';
import { DeleteBlock, SheetHead } from './sheet-head';

/** Ajouter / modifier un jour de cabinet ; ou « Ajouter N jours » pour les jours vides sélectionnés. */
@Component({
  selector: 'app-entry-sheet',
  imports: [SheetHead, Pickers, DeleteBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    @if (!store.cabinets().length) {
      <app-sheet-head title="Ajouter un cabinet" />
      <p>Aucun cabinet pour l'instant. Créez-en un dans « Mon activité ».</p>
      <button class="btn primary big" (click)="ui.openSheet({ type: 'cab', id: null, ret: null })">Créer un cabinet</button>
    } @else {
      <app-sheet-head [title]="title()" />
      <p class="sub">{{ sub() }}</p>
      <app-pickers [state]="st()" [allowRest]="!!dates()" [allowPerso]="!id()" [keepCab]="keepCab" (picked)="st.set($event); err.set('')" (done)="save()" />
      @if (err()) { <p class="err" role="alert">{{ err() }}</p> }
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn primary big" [disabled]="actions.busy()" (click)="save()">{{ dates() ? 'Ajouter' : 'Enregistrer' }}</button>
        <button class="btn text" (click)="ui.closeSheet()">Annuler</button>
        @if (id()) {
          <app-delete-block label="Supprimer ce jour" [question]="'Supprimer ' + store.cab(st().cab!).name + ' le ' + dayLabel(date()!).toLowerCase() + ' ?'" (confirmed)="del()" />
        }
      </div>
    }`,
})
export class EntrySheet {
  protected ui = inject(UiState);
  protected store = inject(PlanningStore);
  protected actions = inject(Actions);
  protected dayLabel = dayLabel;
  readonly date = input<string | null>(null);
  readonly dates = input<string[] | null>(null);
  readonly id = input<string | null>(null);

  protected st = signal<PickState>({ cab: null, nurse: null, slot: 'full', rest: false, perso: false, label: '' });
  protected err = signal('');
  /** Cabinet d'origine du jour modifié (proposé même s'il est en veille). */
  protected keepCab: string | null = null;

  protected title = computed(() => { const n = this.dates()?.length ?? 0; return n ? `Ajouter ${n} jour${n > 1 ? 's' : ''}` : this.id() ? 'Modifier ce jour' : this.st().perso ? 'Ajouter un rendez-vous perso' : 'Ajouter un cabinet'; });
  protected sub = computed(() => (this.dates() ? cap(listDates(this.dates()!)) : dayLabel(this.date()!)));

  ngOnInit(): void {
    const e = this.id() ? this.store.entries(this.date()!).find(x => x.id === this.id()) : null;
    if (e) { this.st.set({ cab: e.cabinetId, nurse: e.nurseId, slot: e.slot, rest: false, perso: false, label: '' }); this.keepCab = e.cabinetId; }
  }

  protected del = async () => {
    const r = await this.actions.deleteEntry(this.id()!);
    if (r.ok) this.ui.closeSheet(); else this.err.set(r.error ?? '');
  };

  protected async save(): Promise<void> {
    const s = this.st();
    if (s.perso) {
      const r = await this.actions.addEvents(this.dates() ?? [this.date()!], s.slot, s.label, true);
      if (!r.ok) { if (r.error) this.err.set(r.error); return; }
      if (this.dates()) this.ui.pick.set([]);
      this.ui.closeSheet();
      return;
    }
    if (!(this.dates() && s.rest)) {
      if (!s.cab) { this.err.set("Choisissez d'abord un cabinet."); return; }
      if (this.store.nursesOf(s.cab).length && !s.nurse) { this.err.set("Choisissez l'infirmière remplacée."); return; }
    }
    const r = this.dates() ? await this.actions.addToPicked(this.dates()!, s) : await this.actions.saveEntry(this.date()!, this.id(), s.cab!, s.nurse, s.slot);
    if (!r.ok) { if (r.error) this.err.set(r.error); return; }
    if (this.dates()) this.ui.pick.set([]);
    this.ui.closeSheet();
  }
}
