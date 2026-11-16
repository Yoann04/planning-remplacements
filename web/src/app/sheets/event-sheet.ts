import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Actions } from '../core/actions';
import { cap, dayLabel } from '../core/dates';
import { Slot } from '../core/models';
import { PlanningStore } from '../core/planning.store';
import { SLOT_LABEL } from '../core/rules';
import { UiState } from '../core/ui.state';
import { DeleteBlock, SheetHead } from './sheet-head';

/** Modifier ou supprimer un rendez-vous perso, sans toucher au reste de la journée. */
@Component({
  selector: 'app-event-sheet',
  imports: [SheetHead, DeleteBlock, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <app-sheet-head title="Rendez-vous perso" />
    <p class="sub">{{ day() }}</p>
    <div class="f"><div class="lbl">Durée</div>
      <div class="seg" role="group" aria-label="Durée du rendez-vous">
        @for (s of slots; track s) { <button [attr.aria-pressed]="slot() === s" (click)="slot.set(s)">{{ label[s] }}</button> }
      </div>
    </div>
    <div class="f"><label class="lbl" for="shEvLabel">Texte <span>(facultatif)</span></label>
      <input id="shEvLabel" type="text" [(ngModel)]="text" (keydown.enter)="save()" placeholder="RDV perso" autocomplete="off" maxlength="80">
      <p class="hint">Simple information : vous pouvez quand même travailler ce jour-là. Pas de détail médical.</p>
    </div>
    @if (err()) { <p class="err" role="alert">{{ err() }}</p> }
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn primary big" [disabled]="actions.busy()" (click)="save()">Enregistrer</button>
      <button class="btn text" (click)="ui.closeSheet()">Annuler</button>
      <app-delete-block label="Supprimer le rendez-vous" question="Supprimer ce rendez-vous perso ? Le reste de la journée ne change pas." (confirmed)="del()" />
    </div>`,
})
export class EventSheet {
  protected ui = inject(UiState);
  protected actions = inject(Actions);
  private store = inject(PlanningStore);
  protected slots: Slot[] = ['full', 'am', 'pm'];
  protected label = SLOT_LABEL;
  readonly id = input.required<string>();
  protected slot = signal<Slot>('full');
  protected text = signal('');
  protected err = signal('');
  private event = computed(() => this.store.planning().events.find(e => e.id === this.id()));
  protected day = computed(() => { const e = this.event(); return e ? cap(dayLabel(e.date)) : ''; });

  ngOnInit(): void {
    const e = this.event();
    if (e) { this.slot.set(e.slot); this.text.set(e.label === 'RDV perso' ? '' : e.label); }
  }

  protected async save(): Promise<void> {
    const r = await this.actions.saveEvent(this.id(), this.slot(), this.text().trim());
    if (r.ok) this.ui.closeSheet(); else this.err.set(r.error ?? '');
  }

  protected del = async () => {
    const r = await this.actions.deleteEvent(this.id());
    if (r.ok) this.ui.closeSheet(); else this.err.set(r.error ?? '');
  };
}
