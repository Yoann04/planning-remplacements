import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DOW3, dow, mabbr, monthRange, parseKey, todayKey, yearRange } from '../core/dates';
import { WorkDay } from '../core/models';
import { PlanningStore } from '../core/planning.store';
import { SLOT_LABEL, SLOT_ORDER, num, slotValue } from '../core/rules';
import { UiState } from '../core/ui.state';
import { DatePickers } from '../shared/date-pickers';
import { Icon } from '../shared/icon';

/** Fiche d'un cabinet : jours faits et prévus sur le mois ou l'année, filtre par infirmière, bouton « Modifier ». */
@Component({
  selector: 'app-cabinet-view',
  imports: [Icon, DatePickers, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    @if (cab(); as cb) {
      <div class="head">
        <button class="btn" style="height:44px;border-width:1.5px;padding:0 14px 0 8px" (click)="ui.actCab.set(null); ui.scrollTo.set(0)"><app-icon name="prev" [size]="22" />Mon activité</button>
        <button class="btn primary" style="height:44px;padding:0 20px" (click)="ui.openSheet({ type: 'cab', id: cb.id, ret: null })">Modifier</button>
      </div>
      <div class="cabtitle kc" [style.--kc]="cb.color"><span class="chip">{{ cb.code }}</span><h1>{{ cb.name }}</h1></div>
      <div class="seg" role="group" aria-label="Période">
        <button [attr.aria-pressed]="ui.cabPeriod() === 'month'" (click)="ui.cabPeriod.set('month')">Mois</button>
        <button [attr.aria-pressed]="ui.cabPeriod() === 'year'" (click)="ui.cabPeriod.set('year')">Année</button>
      </div>
      <div class="navrow">
        <button class="iconbtn" (click)="ui.nav(-1)" aria-label="Précédent"><app-icon name="prev" [size]="22" /></button>
        <div class="pk"><app-date-pickers [period]="ui.cabPeriod()" /></div>
        <button class="iconbtn" (click)="ui.nav(1)" aria-label="Suivant"><app-icon name="next" [size]="22" /></button>
      </div>
      @if (filters().length > 1) {
        <div class="f"><div class="lbl">Voir par infirmière</div>
          <div class="opts">@for (f of filters(); track f.id) { <button class="opt" [attr.aria-pressed]="flt() === f.id" (click)="ui.cabNurse.set(f.id)">{{ f.name }}</button> }</div>
        </div>
      }
      <div class="tiles">
        <div class="tile dark"><b>{{ num(data().sd + data().st) }}</b><span>jours au total</span></div>
        <div class="tile"><b>{{ num(data().sd) }}</b><span>jours faits</span></div>
        <div class="tile"><b>{{ num(data().st) }}</b><span>jours prévus</span></div>
      </div>
      @if (byNurse().length) {
        <h2>Par infirmière</h2>
        <div class="dlist">
          @for (n of byNurse(); track n.id) {
            <button class="nb" (click)="ui.cabNurse.set(n.id)"><span>{{ n.name }}</span><small>{{ num(n.done) }} fait{{ n.done >= 2 ? 's' : '' }} · {{ num(n.todo) }} prévu{{ n.todo >= 2 ? 's' : '' }}</small><b>{{ num(n.done + n.todo) }} j</b><span class="go"><app-icon name="go" [size]="18" /></span></button>
          }
        </div>
      }
      <h2>Jours faits <span>({{ num(data().sd) }})</span></h2>
      <div class="dlist kc" [style.--kc]="cb.color">
        @for (r of data().done; track r.id) { <ng-container *ngTemplateOutlet="row; context: { $implicit: r }" /> } @empty { <p class="hint">Aucun jour fait sur cette période.</p> }
      </div>
      <h2>Jours prévus <span>({{ num(data().st) }})</span></h2>
      <div class="dlist kc" [style.--kc]="cb.color">
        @for (r of data().todo; track r.id) { <ng-container *ngTemplateOutlet="row; context: { $implicit: r }" /> } @empty { <p class="hint">Aucun jour prévu sur cette période.</p> }
      </div>
      <ng-template #row let-r>
        <button class="drow" (click)="ui.openDay(r.date)"><div><b>{{ rowDate(r.date) }}</b><small>{{ store.nurse(r.nurseId)?.name ?? 'Sans infirmière indiquée' }}</small></div><em>{{ r.slot === 'full' ? 'Journée' : slotLabel[r.slot] + ' · ½' }}</em></button>
      </ng-template>
    }`,
})
export class CabinetView {
  protected ui = inject(UiState);
  protected store = inject(PlanningStore);
  protected num = num;
  protected slotLabel: Record<string, string> = SLOT_LABEL;

  protected cab = computed(() => this.store.cabinets().find(c => c.id === this.ui.actCab()) ?? null);
  private all = computed(() => {
    const [f, t] = this.ui.cabPeriod() === 'month' ? monthRange(this.ui.cur()) : yearRange(this.ui.cur());
    return this.store.planning().days.filter(d => d.cabinetId === this.ui.actCab() && d.date >= f && d.date <= t);
  });
  private orphan = computed(() => this.all().some(d => !d.nurseId));
  private nurses = computed(() => this.store.nursesOf(this.ui.actCab()));
  protected filters = computed(() => [{ id: 'all', name: 'Toutes' }, ...this.nurses().map(n => ({ id: n.id, name: n.name })), ...(this.orphan() ? [{ id: '-', name: 'Sans infirmière' }] : [])]);
  /** Filtre courant, ramené à « Toutes » s'il ne correspond plus à rien. */
  protected flt = computed(() => (this.filters().some(f => f.id === this.ui.cabNurse()) ? this.ui.cabNurse() : 'all'));

  protected data = computed(() => {
    const flt = this.flt(), today = todayKey();
    const rows = this.all().filter(d => flt === 'all' || (flt === '-' ? !d.nurseId : d.nurseId === flt))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]));
    const done = rows.filter(r => r.date <= today).reverse(), todo = rows.filter(r => r.date > today);
    const sum = (a: WorkDay[]) => a.reduce((s, r) => s + slotValue(r.slot), 0);
    return { done, todo, sd: sum(done), st: sum(todo) };
  });

  protected byNurse = computed(() => {
    if (this.flt() !== 'all' || !this.all().length || !(this.nurses().length > 1 || this.orphan())) return [];
    const today = todayKey();
    const ids = [...this.nurses().map(n => n.id), ...(this.orphan() ? ['-'] : [])];
    return ids.map(id => {
      const rr = this.all().filter(d => (id === '-' ? !d.nurseId : d.nurseId === id));
      const done = rr.filter(d => d.date <= today).reduce((s, d) => s + slotValue(d.slot), 0);
      const todo = rr.filter(d => d.date > today).reduce((s, d) => s + slotValue(d.slot), 0);
      return { id, name: id === '-' ? 'Sans infirmière' : this.store.nurse(id)?.name ?? '', done, todo };
    });
  });

  constructor() {
    // Cabinet supprimé pendant qu'on le regarde : retour à « Mon activité ».
    effect(() => { if (this.ui.actCab() && this.store.loaded() && !this.cab()) this.ui.actCab.set(null); });
  }

  protected rowDate(k: string): string {
    const d = parseKey(k);
    return `${DOW3[dow(d)]} ${d.getDate()} ${mabbr(d)}${this.ui.cabPeriod() === 'year' ? ' ' + d.getFullYear() : ''}`;
  }
}
