import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Actions } from '../core/actions';
import { PlanningStore } from '../core/planning.store';
import { UiState } from '../core/ui.state';
import { DeleteBlock, SheetHead } from './sheet-head';

/** Modifier ou supprimer un pense-bête. */
@Component({
  selector: 'app-note-sheet',
  imports: [SheetHead, DeleteBlock, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <app-sheet-head title="Pense-bête" />
    <p class="sub">{{ who() }}</p>
    <div class="f"><label class="lbl" for="shNoteTxt">Texte</label>
      <input id="shNoteTxt" type="text" [(ngModel)]="text" (keydown.enter)="save()" autocomplete="off" maxlength="500">
      <p class="hint">Ne notez ni nom de patient ni information de santé.</p>
    </div>
    @if (err()) { <p class="err" role="alert">{{ err() }}</p> }
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn primary big" [disabled]="actions.busy()" (click)="save()">Enregistrer</button>
      <button class="btn text" (click)="ui.closeSheet()">Annuler</button>
      <app-delete-block label="Supprimer le pense-bête" question="Supprimer ce pense-bête ?" (confirmed)="del()" />
    </div>`,
})
export class NoteSheet {
  protected ui = inject(UiState);
  protected actions = inject(Actions);
  private store = inject(PlanningStore);
  readonly id = input.required<string>();
  protected text = signal('');
  protected err = signal('');
  private note = computed(() => this.store.planning().notes.find(n => n.id === this.id()));
  protected who = computed(() => {
    const n = this.note();
    if (!n) return '';
    return n.scope === 'day' ? 'Ce jour' : n.scope === 'cabinet' ? this.store.cab(n.cabinetId!).name : this.store.nurse(n.nurseId)?.name ?? '';
  });

  ngOnInit(): void {
    this.text.set(this.note()?.text ?? '');
  }

  protected del = async () => {
    const r = await this.actions.deleteNote(this.id());
    if (r.ok) this.ui.closeSheet(); else this.err.set(r.error ?? '');
  };

  protected async save(): Promise<void> {
    const t = this.text().trim();
    if (!t) { this.err.set('Le pense-bête ne peut pas être vide.'); return; }
    const r = await this.actions.saveNote(this.id(), t);
    if (r.ok) this.ui.closeSheet(); else this.err.set(r.error ?? '');
  }
}
