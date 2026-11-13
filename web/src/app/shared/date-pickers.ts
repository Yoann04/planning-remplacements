import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MONTHS, cap } from '../core/dates';
import { PlanningStore } from '../core/planning.store';
import { UiState } from '../core/ui.state';

/** Listes déroulantes du mois et de l'année. */
@Component({
  selector: 'app-date-pickers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    @if (period() === 'all') {
      <span class="hs">Depuis le début</span>
    } @else {
      @if (period() === 'month') {
        <span class="dd"><select aria-label="Choisir le mois" (change)="ui.setMonth(+$any($event.target).value)">
          @for (m of months; track $index) { <option [value]="$index" [selected]="$index === ui.cur().getMonth()">{{ m }}</option> }
        </select></span>
      }
      <span class="dd"><select aria-label="Choisir l'année" (change)="ui.setYear(+$any($event.target).value)">
        @for (y of years(); track y) { <option [value]="y" [selected]="y === ui.cur().getFullYear()">{{ y }}</option> }
      </select></span>
    }`,
})
export class DatePickers {
  protected ui = inject(UiState);
  private store = inject(PlanningStore);
  readonly period = input<'month' | 'year' | 'all'>('month');
  protected months = MONTHS.map(cap);
  protected years = computed(() => {
    const cy = this.ui.cur().getFullYear(), ty = new Date().getFullYear();
    let lo = Math.min(cy, ty) - 3, hi = Math.max(cy, ty) + 3;
    for (const d of this.store.planning().days) { const y = +d.date.slice(0, 4); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  });
}
