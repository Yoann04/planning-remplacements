import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Actions } from '../core/actions';
import { dayLabel } from '../core/dates';
import { Slot } from '../core/models';
import { PlanningStore } from '../core/planning.store';
import { SLOT_LABEL } from '../core/rules';
import { UiState } from '../core/ui.state';
import { DeleteBlock, SheetHead } from './sheet-head';

/** Repos voulu d'un jour : journée, matin ou après-midi. */
@Component({
  selector: 'app-rest-sheet',
  imports: [SheetHead, DeleteBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <app-sheet-head [title]="editing() ? 'Modifier le repos' : 'Repos voulu'" />
    <p class="sub">{{ dayLabel(date()) }}</p>
    <div class="f"><div class="lbl">Durée</div>
      <div class="seg" role="group" aria-label="Durée">
        @for (s of slots; track s) { <button [attr.aria-pressed]="slot() === s" (click)="slot.set(s); err.set('')">{{ label[s] }}</button> }
      </div>
    </div>
    <p class="hint">Journée = 1 jour de repos. Matin ou après-midi = ½ jour.</p>
    @if (err()) { <p class="err" role="alert">{{ err() }}</p> }
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn primary big" [disabled]="actions.busy()" (click)="save()">Enregistrer</button>
      <button class="btn text" (click)="ui.closeSheet()">Annuler</button>
      @if (editing()) {
        <app-delete-block label="Supprimer ce repos" [question]="'Supprimer le repos voulu du ' + dayLabel(date()).toLowerCase() + ' ?'" (confirmed)="del()" />
      }
    </div>`,
})
export class RestSheet {
  protected ui = inject(UiState);
  protected actions = inject(Actions);
  private store = inject(PlanningStore);
  protected dayLabel = dayLabel;
  protected label = SLOT_LABEL;
  protected slots: Slot[] = ['full', 'am', 'pm'];
  readonly date = input.required<string>();
  readonly editing = input(false);
  protected slot = signal<Slot>('full');
  protected err = signal('');

  ngOnInit(): void {
    this.slot.set(this.store.rest(this.date()) ?? 'full');
  }

  protected del = async () => {
    const r = await this.actions.deleteRest(this.date());
    if (r.ok) this.ui.closeSheet(); else this.err.set(r.error ?? '');
  };

  protected async save(): Promise<void> {
    const r = await this.actions.saveRest(this.date(), this.slot());
    if (r.ok) this.ui.closeSheet(); else this.err.set(r.error ?? '');
  }
}
