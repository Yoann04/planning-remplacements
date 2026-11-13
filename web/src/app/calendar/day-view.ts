import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Actions } from '../core/actions';
import { dayLabel, isoWeek, key } from '../core/dates';
import { NoteScope, WorkDay } from '../core/models';
import { PlanningStore } from '../core/planning.store';
import { SLOT_LABEL, jours, num, restText, slotValue } from '../core/rules';
import { UiState } from '../core/ui.state';
import { Chip } from '../shared/chip';
import { Head } from '../shared/head';
import { Icon } from '../shared/icon';
import { ViewSwitch } from '../shared/view-switch';
import { DayTags } from './day-tags';

/** Vue jour : cabinets du jour, repos voulu, pense-bêtes (du jour, des cabinets et des infirmières concernés). */
@Component({
  selector: 'app-day-view',
  imports: [Head, ViewSwitch, Chip, Icon, DayTags, FormsModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    @let k = dayKey();
    <app-head [title]="label()" [sub]="ui.cur().getFullYear() + ' · semaine ' + week()" />
    <app-view-switch />
    <app-day-tags [day]="k" [long]="true" />
    <div class="dsum"><span>{{ summary().left }}</span><strong>{{ summary().right }}</strong></div>
    @if (rest() === 'am') { <ng-container *ngTemplateOutlet="restCard" /> }
    @for (e of entries(); track e.id) {
      <button class="card entry kc" [style.--kc]="store.cab(e.cabinetId).color" (click)="ui.openSheet({ type: 'entry', date: k, dates: null, id: e.id })">
        <div class="cap">{{ e.slot === 'full' ? 'Journée · 1 jour' : slotLabel[e.slot] + ' · 0,5 jour' }}</div>
        <div class="who"><app-chip [entry]="e" size="xl" /><div><b>{{ store.cab(e.cabinetId).name }}</b><small>{{ store.nurse(e.nurseId) ? 'Remplace ' + store.nurse(e.nurseId)!.name : 'Sans infirmière indiquée' }}</small></div><span class="go"><app-icon name="go" [size]="18" /></span></div>
        <span class="tap">Toucher pour modifier ou supprimer</span>
      </button>
    }
    @if (rest() && rest() !== 'am') { <ng-container *ngTemplateOutlet="restCard" /> }
    <ng-template #restCard>
      <button class="card entry restcard" (click)="ui.openSheet({ type: 'rest', date: k, editing: true })">
        <div class="cap">{{ rest() === 'full' ? 'Journée · repos voulu' : slotLabel[rest()!] + ' · ½ journée de repos' }}</div>
        <div class="who"><div><b>Repos voulu</b><small>Vous ne souhaitez pas travailler</small></div><span class="go"><app-icon name="go" [size]="18" /></span></div>
        <span class="tap">Toucher pour modifier ou supprimer</span>
      </button>
    </ng-template>
    <div class="row">
      <button class="btn" style="font-size:15px" (click)="ui.openSheet({ type: 'entry', date: k, dates: null, id: null })"><app-icon name="plus" [stroke]="2.6" />Ajouter un cabinet</button>
      @if (!rest()) { <button class="btn" (click)="ui.openSheet({ type: 'rest', date: k, editing: false })">Repos voulu</button> }
    </div>
    <h2>Pense-bêtes</h2>
    <div class="notes">
      @for (n of notes(); track n.id) {
        <button class="nrow" (click)="ui.openSheet({ type: 'note', id: n.id })"><app-icon name="note" [size]="18" [stroke]="2" /><div><small>{{ n.who }}</small>{{ n.text }}</div><span class="go"><app-icon name="go" [size]="18" /></span></button>
      } @empty { <p class="hint">Aucun pense-bête pour ce jour.</p> }
    </div>
    <div class="f"><div class="lbl">Rattacher à</div>
      <div class="opts">
        @for (s of scopes; track s[0]) { <button class="opt" style="height:40px;font-size:15px" [attr.aria-pressed]="scope() === s[0]" (click)="scope.set(s[0]); target.set(null)">{{ s[1] }}</button> }
      </div>
    </div>
    @if (scope() === 'cabinet') {
      <div class="opts">
        @for (c of store.cabinets(); track c.id) { <button class="opt cab kc" [style.--kc]="c.color" [attr.aria-pressed]="target() === c.id" (click)="target.set(c.id)"><span class="chip">{{ c.code }}</span>{{ c.name }}</button> }
        @empty { <span class="hint">Aucun cabinet.</span> }
      </div>
    } @else if (scope() === 'nurse') {
      <div class="opts">
        @for (n of store.nurses(); track n.id) { <button class="opt" [attr.aria-pressed]="target() === n.id" (click)="target.set(n.id)">{{ n.name }}</button> }
        @empty { <span class="hint">Aucune infirmière.</span> }
      </div>
    }
    <div class="field">
      <label for="noteIn" class="vh">Nouveau pense-bête</label>
      <input id="noteIn" type="text" [(ngModel)]="draft" (keydown.enter)="addNote()" placeholder="Écrire un pense-bête…" autocomplete="off" maxlength="500">
      <button class="btn primary" [disabled]="actions.busy()" (click)="addNote()">Ajouter</button>
    </div>
    <p class="hint">Ne notez ni nom de patient ni information de santé.</p>`,
})
export class DayView {
  protected ui = inject(UiState);
  protected store = inject(PlanningStore);
  protected actions = inject(Actions);
  protected slotLabel = SLOT_LABEL;
  protected scopes: [NoteScope, string][] = [['day', 'Ce jour'], ['cabinet', 'Un cabinet'], ['nurse', 'Une infirmière']];
  protected scope = signal<NoteScope>('day');
  protected target = signal<string | null>(null);
  protected draft = signal('');

  protected dayKey = computed(() => key(this.ui.cur()));
  protected label = computed(() => dayLabel(this.dayKey()));
  protected week = computed(() => isoWeek(this.ui.cur()));
  protected entries = computed(() => this.store.entries(this.dayKey()));
  protected rest = computed(() => this.store.rest(this.dayKey()));

  protected summary = computed(() => {
    const es = this.entries(), r = this.rest(), tot = es.reduce((a, e) => a + slotValue(e.slot), 0);
    const nc = new Set(es.map(e => e.cabinetId)).size;
    return {
      left: nc ? `${nc} cabinet${nc > 1 ? 's' : ''} ce jour-là` : 'Ce jour-là',
      right: !es.length ? (r ? restText(r) : 'Aucun cabinet') : jours(tot) + (es.length > 1 ? ' (' + es.map(e => num(slotValue(e.slot))).join(' + ') + ')' : ''),
    };
  });

  /** Pense-bêtes du jour, puis ceux des cabinets et des infirmières présents ce jour-là. */
  protected notes = computed(() => {
    const es: WorkDay[] = this.entries();
    const out = this.store.dayNotes(this.dayKey()).map(n => ({ ...n, who: 'Ce jour' }));
    for (const id of new Set(es.map(e => e.cabinetId))) out.push(...this.store.cabNotes(id).map(n => ({ ...n, who: this.store.cab(id).name })));
    for (const id of new Set(es.map(e => e.nurseId).filter((x): x is string => !!x))) {
      const nu = this.store.nurse(id);
      if (nu) out.push(...this.store.nurseNotes(id).map(n => ({ ...n, who: nu.name })));
    }
    return out;
  });

  protected async addNote(): Promise<void> {
    const text = this.draft().trim();
    if (!text) { this.ui.toast("Écrivez d'abord le pense-bête."); return; }
    const sc = this.scope(), t = this.target();
    if (sc === 'cabinet' && !t) { this.ui.toast('Choisissez un cabinet.'); return; }
    if (sc === 'nurse' && !t) { this.ui.toast('Choisissez une infirmière.'); return; }
    const r = await this.actions.addNote(sc, text, sc === 'day' ? { date: this.dayKey() } : sc === 'cabinet' ? { cabinetId: t! } : { nurseId: t! });
    if (r.ok) {
      this.draft.set('');
      document.getElementById('noteIn')?.focus();
    }
  }
}
