import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { PlanningStore } from '../core/planning.store';

/** Étiquettes « Férié · … » et « Vacances · … » d'un jour. */
@Component({
  selector: 'app-day-tags',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    @if (fe() || va()) {
      <div class="tags">
        @if (fe()) { <span class="tg f">{{ long() ? 'Jour férié' : 'Férié' }} · {{ fe() }}</span> }
        @if (va()) { <span class="tg v">{{ long() ? 'Vacances scolaires' : 'Vacances' }} · {{ va() }}@if (long()) { (zone {{ store.zone() }})}</span> }
      </div>
    }`,
})
export class DayTags {
  protected store = inject(PlanningStore);
  readonly day = input.required<string>();
  readonly long = input(false);
  protected fe = computed(() => this.store.ferie(this.day()));
  protected va = computed(() => this.store.vacation(this.day()));
}
