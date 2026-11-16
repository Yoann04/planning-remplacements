import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { ApiService } from '../core/api.service';
import { MONTHS, cap, monthRange, yearRange } from '../core/dates';
import { PlanningStore } from '../core/planning.store';
import { num } from '../core/rules';
import { Period, UiState } from '../core/ui.state';
import { DatePickers } from '../shared/date-pickers';
import { Head } from '../shared/head';
import { Icon } from '../shared/icon';

/** « Mon activité » : compteurs calculés par l'API (/api/stats) pour le mois, l'année ou depuis le début. */
@Component({
  selector: 'app-activity-view',
  imports: [Head, Icon, DatePickers, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <app-head title="Mon activité" [hideNav]="ui.period() === 'all'"><div class="pk"><app-date-pickers [period]="ui.period()" /></div></app-head>
    <div class="seg" role="group" aria-label="Période">
      @for (p of periods; track p[0]) { <button [attr.aria-pressed]="ui.period() === p[0]" (click)="ui.setPeriod(p[0])">{{ p[1] }}</button> }
    </div>
    @if (stats.error()) {
      <div class="empty"><p>Impossible de charger les compteurs.</p><button class="btn" (click)="stats.reload()">Réessayer</button></div>
    } @else {
      @let s = stats.value();
      <div class="tiles" [style.opacity]="stats.isLoading() ? .6 : 1">
        <div class="tile dark"><b>{{ num(s?.days?.total ?? 0) }}</b><span>jours au total</span></div>
        <div class="tile"><b>{{ num(s?.days?.done ?? 0) }}</b><span>jours faits</span></div>
        <div class="tile"><b>{{ num(s?.days?.todo ?? 0) }}</b><span>jours prévus</span></div>
        <div class="tile w3"><b>{{ num(s?.rests?.done ?? 0) }}</b><span>repos faits</span></div>
        <div class="tile w3"><b>{{ num(s?.rests?.todo ?? 0) }}</b><span>repos prévus</span></div>
      </div>
      <h2>Par cabinet</h2>
      @for (c of active(); track c.id) { <ng-container *ngTemplateOutlet="card; context: { $implicit: c }" /> }
      @empty {
        <div class="empty"><p>{{ standby().length ? 'Aucun cabinet actif. Réactivez un cabinet en veille, ou ajoutez-en un avec le bouton « Un cabinet ».' : 'Aucun cabinet. Ajoutez le premier avec le bouton « Un cabinet ».' }}</p></div>
      }
      <button class="btn primary" (click)="ui.openSheet({ type: 'cab', id: null, ret: null })"><app-icon name="plus" [stroke]="2.6" />Un cabinet</button>
      @if (standby().length) {
        <button class="btn standby-t" [attr.aria-expanded]="ui.standbyOpen()" (click)="ui.standbyOpen.set(!ui.standbyOpen())">
          <span>Cabinets en veille ({{ standby().length }})</span><app-icon [name]="ui.standbyOpen() ? 'up' : 'down'" [size]="20" />
        </button>
        @if (ui.standbyOpen()) {
          <p class="hint">Remplacements terminés : ils ne sont plus proposés pour ajouter des jours. Leurs jours et leurs compteurs restent.</p>
          @for (c of standby(); track c.id) { <ng-container *ngTemplateOutlet="card; context: { $implicit: c }" /> }
        }
      }
      <ng-template #card let-c>
        <button class="cabcard kc" [class.asleep]="!c.active" [style.--kc]="c.color" (click)="ui.openCabinet(c.id)" [attr.aria-label]="'Voir le détail de ' + c.name">
          <div class="top"><span class="chip lg">{{ c.code }}</span><b>{{ c.name }}</b><em>{{ num(c.total) }} j</em><span class="go"><app-icon name="go" [size]="18" /></span></div>
          <div class="bar"><i [style.width.%]="c.pct"></i></div>
          <div class="nl">
            @for (n of c.nurses; track n.id) { <span>{{ n.name }} · {{ num(n.v) }} j</span> } @empty { <span>Aucun jour sur cette période</span> }
          </div>
          @if (c.note) { <div class="notep"><app-icon name="note" [size]="18" [stroke]="2" /><span>{{ c.note }}</span></div> }
        </button>
      </ng-template>
      @if (ui.period() !== 'month' && months().length) {
        <h2>Par mois</h2>
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (m of months(); track m.k) { <div class="mrow"><span>{{ m.label }}</span><div class="bar"><i [style.width.%]="m.pct"></i></div><b>{{ num(m.v) }} j</b></div> }
        </div>
      }
    }
    <button class="btn text" (click)="ui.openSheet({ type: 'settings' })">Réglages</button>
    <p class="foot">Vos données sont enregistrées sur le serveur et liées à votre compte.</p>`,
})
export class ActivityView {
  protected ui = inject(UiState);
  private store = inject(PlanningStore);
  private api = inject(ApiService);
  protected num = num;
  protected periods: [Period, string][] = [['month', 'Ce mois'], ['year', 'Cette année'], ['all', 'Tout']];

  private range = computed(() => {
    const p = this.ui.period(), c = this.ui.cur();
    return p === 'month' ? monthRange(c) : p === 'year' ? yearRange(c) : ['1900-01-01', '2999-12-31'];
  });

  /** Rechargé quand la période change ou quand le planning est modifié. */
  protected stats = resource({
    params: () => ({ range: this.range(), v: this.store.version() }),
    loader: ({ params }) => this.api.stats(params.range[0], params.range[1]),
  });

  protected cards = computed(() => {
    const s = this.stats.value(), by = s?.cabinets ?? {};
    const max = Math.max(1, ...this.store.cabinets().map(c => by[c.id]?.total ?? 0));
    return this.store.cabinets().map(c => {
      const b = by[c.id], notes = this.store.cabNotes(c.id);
      return {
        ...c, total: b?.total ?? 0, pct: Math.round(((b?.total ?? 0) / max) * 100),
        nurses: Object.entries(b?.nurses ?? {}).map(([id, v]) => ({ id, v, name: id === '-' ? 'Sans infirmière' : (this.store.nurse(id)?.name ?? 'Infirmière supprimée') })),
        note: notes.length ? notes[0].text + (notes.length > 1 ? ` (+${notes.length - 1})` : '') : '',
      };
    });
  });

  protected active = computed(() => this.cards().filter(c => c.active));
  protected standby = computed(() => this.cards().filter(c => !c.active));

  protected months = computed(() => {
    const ms = this.stats.value()?.months ?? {}, ks = Object.keys(ms).sort(), max = Math.max(1, ...ks.map(k => ms[k]));
    return ks.map(k => { const [y, m] = k.split('-'); return { k, v: ms[k], pct: Math.round((ms[k] / max) * 100), label: `${cap(MONTHS[+m - 1])} ${y}` }; });
  });
}
