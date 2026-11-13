import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PlanningStore } from '../core/planning.store';

/** Légende : couleurs des cabinets, repos voulu, jours fériés, vacances scolaires. */
@Component({
  selector: 'app-legend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <div class="legend">
      @for (c of store.cabinets(); track c.id) { <span class="kc" [style.--kc]="c.color"><i class="sw"></i>{{ c.name }}</span> }
      <span><i class="sw rest"></i>Repos voulu</span>
      <span><i class="sw fer"></i>Jour férié</span>
      @if (store.zone() !== 'none') { <span><i class="sw vac"></i>Vacances scolaires (zone {{ store.zone() }})</span> }
    </div>`,
})
export class Legend {
  protected store = inject(PlanningStore);
}
