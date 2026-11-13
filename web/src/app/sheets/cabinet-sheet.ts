import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Actions } from '../core/actions';
import { PlanningStore } from '../core/planning.store';
import { PALETTE, autoCode, freeColor } from '../core/rules';
import { UiState } from '../core/ui.state';
import { Icon } from '../shared/icon';
import { DeleteBlock, SheetHead } from './sheet-head';

interface Row { key: string; id?: string; text: string }
let seq = 0;
const tmp = () => 'tmp' + ++seq;

/**
 * Nouveau cabinet / Modifier le cabinet. Les infirmières sont créées, renommées et supprimées uniquement ici ;
 * tout est envoyé à l'API en une fois avec « Enregistrer le cabinet ».
 */
@Component({
  selector: 'app-cabinet-sheet',
  imports: [SheetHead, DeleteBlock, Icon, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <app-sheet-head [title]="id() ? 'Modifier le cabinet' : 'Nouveau cabinet'" />
    <div class="f"><label class="lbl" for="shName">Nom du cabinet</label>
      <input id="shName" type="text" [ngModel]="name()" (ngModelChange)="setName($event)" placeholder="Par exemple : Cabinet des Lilas" autocomplete="off" maxlength="80"></div>
    <div class="codew">
      <div class="f"><label class="lbl" for="shCode">Initiales (2 lettres)</label>
        <input id="shCode" type="text" maxlength="3" [ngModel]="code()" (ngModelChange)="code.set($event); codeTouched = true" style="text-transform:uppercase;font-weight:700" autocomplete="off"></div>
      <span class="chip xl kc" [style.--kc]="color()" style="height:56px;min-width:84px;border-radius:14px;font-size:18px">{{ (code() || autoCode(name()) || '?').toUpperCase() }}</span>
    </div>
    <div class="f"><div class="lbl">Couleur</div>
      <div class="sws">
        @for (c of palette; track c; let i = $index) {
          <button class="swb" [style.--kc]="c" [attr.aria-label]="'Couleur ' + (i + 1)" [attr.aria-pressed]="color().toLowerCase() === c.toLowerCase()" (click)="color.set(c)">
            @if (color().toLowerCase() === c.toLowerCase()) { <app-icon name="check" [size]="18" [stroke]="3" /> }
          </button>
        }
        <label class="swb custom" [class.on]="!inPalette()" [style.--kc]="inPalette() ? null : color()" aria-label="Choisir une autre couleur">
          <input type="color" [value]="color()" (input)="color.set($any($event.target).value.toUpperCase())">
          @if (inPalette()) { + } @else { <app-icon name="check" [size]="18" [stroke]="3" /> }
        </label>
      </div>
    </div>
    <div class="f"><div class="lbl">Infirmières remplacées dans ce cabinet</div>
      @if (nurses().length) {
        <div class="opts">@for (n of nurses(); track n.key) { <button class="opt" [attr.aria-pressed]="pick()?.kind === 'nurse' && pick()?.key === n.key" (click)="pickRow('nurse', n)">{{ n.text }}</button> }</div>
      } @else { <p class="hint">Aucune infirmière pour l'instant.</p> }
      @if (pick()?.kind === 'nurse') {
        @if (confirmPick()) {
          <div class="card"><p><strong>Supprimer {{ pickedText() }} ?</strong> {{ nurseDaysText() }}</p>
            <div class="row"><button class="btn" (click)="confirmPick.set(false)">Non, garder</button><button class="btn danger primary" (click)="removePicked()">Supprimer</button></div></div>
        } @else {
          <div class="card"><label class="lbl" for="shPickName">Prénom de l'infirmière</label>
            <div class="field"><input id="shPickName" type="text" [(ngModel)]="pickName" (keydown.enter)="rename()" autocomplete="off" maxlength="80"><button class="btn" (click)="rename()">Renommer</button></div>
            <button class="btn text danger" (click)="confirmPick.set(true)">Supprimer l'infirmière</button></div>
        }
      }
      <div class="field"><label for="shNurse" class="vh">Ajouter une infirmière</label>
        <input id="shNurse" type="text" [(ngModel)]="nurseDraft" (keydown.enter)="addNurse()" placeholder="Prénom et initiale du nom" autocomplete="off" maxlength="80">
        <button class="btn primary" (click)="addNurse()">Ajouter</button></div>
      <p class="hint">Touchez une infirmière pour la renommer ou la supprimer.</p>
    </div>
    <div class="f"><div class="lbl">Pense-bêtes du cabinet <span>(facultatif)</span></div>
      @if (notes().length) {
        <div class="notes">@for (n of notes(); track n.key) {
          <button class="nrow" [attr.aria-pressed]="pick()?.kind === 'note' && pick()?.key === n.key" (click)="pickRow('note', n)"><app-icon name="note" [size]="18" [stroke]="2" /><div>{{ n.text }}</div><span class="go"><app-icon name="go" [size]="18" /></span></button>
        }</div>
      }
      @if (pick()?.kind === 'note') {
        @if (confirmPick()) {
          <div class="card"><p><strong>Supprimer ce pense-bête ?</strong></p>
            <div class="row"><button class="btn" (click)="confirmPick.set(false)">Non, garder</button><button class="btn danger primary" (click)="removePicked()">Supprimer</button></div></div>
        } @else {
          <div class="card"><p>{{ pickedText() }}</p><button class="btn text danger" (click)="confirmPick.set(true)">Supprimer le pense-bête</button></div>
        }
      }
      <div class="field"><label for="shNote" class="vh">Nouveau pense-bête</label>
        <input id="shNote" type="text" [(ngModel)]="noteDraft" (keydown.enter)="addNote()" placeholder="Par exemple : clé à récupérer" autocomplete="off" maxlength="500">
        <button class="btn" (click)="addNote()">Ajouter</button></div>
      <p class="hint">Ne notez ni nom de patient ni information de santé.</p>
    </div>
    @if (err()) { <p class="err" role="alert">{{ err() }}</p> }
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn primary big" [disabled]="actions.busy()" (click)="save()">Enregistrer le cabinet</button>
      <button class="btn text" (click)="ui.closeSheet()">Annuler</button>
      @if (id()) { <app-delete-block label="Supprimer le cabinet" [question]="deleteQuestion()" (confirmed)="remove()" /> }
    </div>`,
})
export class CabinetSheet {
  protected ui = inject(UiState);
  protected actions = inject(Actions);
  private store = inject(PlanningStore);
  protected autoCode = autoCode;
  protected palette = PALETTE;
  readonly id = input<string | null>(null);
  readonly ret = input<'add' | null>(null);

  protected name = signal('');
  protected code = signal('');
  protected codeTouched = false;
  protected color = signal('#3B82F6');
  protected nurses = signal<Row[]>([]);
  protected notes = signal<Row[]>([]);
  protected nurseDraft = signal('');
  protected noteDraft = signal('');
  protected pick = signal<{ kind: 'nurse' | 'note'; key: string } | null>(null);
  protected pickName = signal('');
  protected confirmPick = signal(false);
  protected err = signal('');

  protected inPalette = computed(() => PALETTE.some(c => c.toLowerCase() === this.color().toLowerCase()));
  protected pickedText = computed(() => { const p = this.pick(); return (p ? (p.kind === 'nurse' ? this.nurses() : this.notes()).find(r => r.key === p.key)?.text : '') ?? ''; });
  protected nurseDaysText = computed(() => {
    const p = this.pick(), row = p && this.nurses().find(r => r.key === p.key);
    const d = row?.id ? this.store.planning().days.filter(x => x.nurseId === row.id).length : 0;
    return d ? `Ses ${d} jour${d > 1 ? 's' : ''} resteront dans le planning, sans infirmière indiquée.` : "Elle n'a aucun jour dans le planning.";
  });
  protected deleteQuestion = computed(() => {
    const d = this.store.planning().days.filter(x => x.cabinetId === this.id()).length;
    return `Supprimer ce cabinet ? ${d ? `Ses ${d} jour${d > 1 ? 's' : ''} seront aussi retirés du planning.` : "Il n'a aucun jour dans le planning."}`;
  });

  ngOnInit(): void {
    const c = this.id() ? this.store.cabinets().find(x => x.id === this.id()) : null;
    if (c) {
      this.name.set(c.name); this.code.set(c.code); this.color.set(c.color); this.codeTouched = true;
      this.nurses.set(this.store.nursesOf(c.id).map(n => ({ key: n.id, id: n.id, text: n.name })));
      this.notes.set(this.store.cabNotes(c.id).map(n => ({ key: n.id, id: n.id, text: n.text })));
    } else {
      this.color.set(freeColor(this.store.cabinets()));
    }
  }

  protected setName(v: string): void {
    this.name.set(v);
    if (!this.codeTouched) this.code.set(autoCode(v));
  }

  protected pickRow(kind: 'nurse' | 'note', r: Row): void {
    const p = this.pick();
    this.pick.set(p && p.kind === kind && p.key === r.key ? null : { kind, key: r.key });
    this.pickName.set(r.text);
    this.confirmPick.set(false);
  }

  protected rename(): void {
    const t = this.pickName().trim(), p = this.pick();
    if (p && t) this.nurses.update(ns => ns.map(n => (n.key === p.key ? { ...n, text: t } : n)));
    this.pick.set(null);
  }

  protected removePicked(): void {
    const p = this.pick();
    if (!p) return;
    (p.kind === 'nurse' ? this.nurses : this.notes).update(rs => rs.filter(r => r.key !== p.key));
    this.pick.set(null);
    this.confirmPick.set(false);
  }

  protected addNurse(): void {
    const t = this.nurseDraft().trim();
    if (t) { this.nurses.update(ns => [...ns, { key: tmp(), text: t }]); this.nurseDraft.set(''); }
    document.getElementById('shNurse')?.focus();
  }

  protected addNote(): void {
    const t = this.noteDraft().trim();
    if (t) { this.notes.update(ns => [...ns, { key: tmp(), text: t }]); this.noteDraft.set(''); }
    document.getElementById('shNote')?.focus();
  }

  protected async save(): Promise<void> {
    // Un nom ou un pense-bête tapé sans avoir appuyé sur « Ajouter » est quand même gardé.
    this.addNurse();
    this.addNote();
    const name = this.name().trim();
    if (!name) { this.err.set('Donnez un nom au cabinet.'); return; }
    const code = ((this.code() || autoCode(name)) || name.slice(0, 2)).toUpperCase().slice(0, 3);
    const r = await this.actions.saveCabinet(this.id(), {
      name, code, color: this.color(),
      nurses: this.nurses().map(n => (n.id ? { id: n.id, name: n.text } : { name: n.text })),
      notes: this.notes().map(n => (n.id ? { id: n.id, text: n.text } : { text: n.text })),
    });
    if (!r.ok) { this.err.set(r.error ?? ''); return; }
    const newId = r.result?.['cabinetId'] as string | undefined;
    const add = this.ui.add();
    if (this.ret() === 'add' && add && newId) {
      const ns = this.store.nursesOf(newId);
      this.ui.add.set({ ...add, cab: newId, rest: false, nurse: ns.length === 1 ? ns[0].id : null });
    }
    this.ui.closeSheet();
  }

  protected async remove(): Promise<void> {
    const r = await this.actions.deleteCabinet(this.id()!);
    if (!r.ok) { this.err.set(r.error ?? ''); return; }
    const add = this.ui.add();
    if (add?.cab === this.id()) this.ui.add.set({ ...add, cab: null, nurse: null });
    if (this.ui.actCab() === this.id()) this.ui.actCab.set(null);
    this.ui.closeSheet();
  }
}
