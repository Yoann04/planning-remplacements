import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { WorkDay } from '../core/models';
import { PlanningStore } from '../core/planning.store';

/** Puce aux initiales du cabinet, dans sa couleur ; « ½ » pour une demi-journée. */
@Component({
  selector: 'app-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `<span class="chip kc" [class]="'chip kc ' + size()" [style.--kc]="cab().color">{{ cab().code }}@if (entry().slot !== 'full') {<i>½</i>}</span>`,
})
export class Chip {
  private store = inject(PlanningStore);
  readonly entry = input.required<WorkDay>();
  readonly size = input('');
  protected cab = computed(() => this.store.cab(this.entry().cabinetId));
}
