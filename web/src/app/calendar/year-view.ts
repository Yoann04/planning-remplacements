import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MONTHS, MS, dow, pad, todayKey, yearRange } from '../core/dates';
import { PlanningStore } from '../core/planning.store';
import { dayTotals, jours } from '../core/rules';
import { UiState } from '../core/ui.state';
import { Head } from '../shared/head';
import { Legend } from '../shared/legend';
import { ViewSwitch } from '../shared/view-switch';

/** Vue année : 12 mini-calendriers colorés par cabinet. */
@Component({
  selector: 'app-year-view',
  imports: [Head, ViewSwitch, Legend],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <app-head [title]="'' + ui.cur().getFullYear()" />
    <app-view-switch />
    <div class="yrs">
      @for (m of months(); track m.i) {
        <button class="ym" [class.cur]="m.isNow" (click)="ui.openMonth(m.i)" [attr.aria-label]="'Ouvrir ' + m.full + ' ' + ui.cur().getFullYear()">
          <b>{{ m.name }}</b>
          <span class="mm">
            @for (x of m.lead; track $index) { <i class="sq none"></i> }
            @for (s of m.squares; track s.k) { <i [class]="s.cls" [style.background]="s.bg"></i> }
          </span>
        </button>
      }
    </div>
    <div class="sum"><strong>{{ jours(total()) }}</strong><span>en {{ ui.cur().getFullYear() }}</span></div>
    <app-legend [range]="range()" />
    <p class="hint">Touchez un mois pour l'ouvrir et modifier vos jours.</p>`,
})
export class YearView {
  protected ui = inject(UiState);
  private store = inject(PlanningStore);
  protected jours = jours;
  protected range = computed(() => yearRange(this.ui.cur()));
  protected total = computed(() => { const [f, t] = this.range(); return dayTotals(this.store.planning().days, f, t).total; });

  protected months = computed(() => {
    const y = this.ui.cur().getFullYear(), today = todayKey(), now = new Date();
    return MS.map((name, i) => {
      const n = new Date(y, i + 1, 0).getDate();
      const squares = Array.from({ length: n }, (_, j) => {
        const k = `${y}-${pad(i + 1)}-${pad(j + 1)}`, es = this.store.entries(k), r = this.store.rest(k);
        let bg = '', cls = 'sq';
        if (es.length) {
          const c1 = this.store.cab(es[0].cabinetId).color;
          bg = es.length > 1 ? `linear-gradient(135deg,${c1} 50%,${this.store.cab(es[1].cabinetId).color} 50%)`
            : es[0].slot !== 'full' ? `linear-gradient(135deg,${c1} 50%,var(--empty) 50%)` : c1;
        } else if (r === 'full') cls += ' rest';
        else if (r) bg = 'linear-gradient(135deg,var(--s1) 50%,var(--empty) 50%)';
        if (k === today) cls += ' today';
        if (this.store.vacation(k)) cls += ' vac';
        if (this.store.ferie(k)) cls += ' fer';
        return { k, cls, bg };
      });
      return { i, name, full: MONTHS[i], lead: Array(dow(new Date(y, i, 1))), squares, isNow: y === now.getFullYear() && i === now.getMonth() };
    });
  });
}
