import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DOW3, MONTHS, addDays, dow, isoWeek, key, mabbr, todayKey } from '../core/dates';
import { PlanningStore } from '../core/planning.store';
import { SLOT_LABEL, jours, restText, slotValue } from '../core/rules';
import { UiState } from '../core/ui.state';
import { Chip } from '../shared/chip';
import { Head } from '../shared/head';
import { Icon } from '../shared/icon';
import { ViewSwitch } from '../shared/view-switch';
import { DayTags } from './day-tags';

/** Vue semaine : une ligne par jour, avec cabinets, infirmières, repos et pense-bêtes. */
@Component({
  selector: 'app-week-view',
  imports: [Head, ViewSwitch, Chip, Icon, DayTags],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <app-head [title]="'Semaine ' + week().num" [sub]="week().sub" />
    <app-view-switch />
    <div style="display:flex;flex-direction:column;gap:8px">
      @for (r of week().rows; track r.k) {
        <button class="wrow" [class.rest]="r.fullRest" [class.vac]="r.vac" [class.today]="r.today" (click)="ui.openDay(r.k)">
          <div class="wd"><div class="w3">{{ r.dow }}</div><div class="wn">{{ r.day }}</div></div>
          <div class="wl">
            <app-day-tags [day]="r.k" />
            @if (r.restFirst) { <div class="rt">{{ r.restLine }}</div> }
            @for (e of r.entries; track e.id) {
              <div class="ln"><app-chip [entry]="e" size="lg" /><div style="min-width:0"><div class="t1">{{ store.cab(e.cabinetId).name }}</div><div class="t2">{{ line(e) }}</div></div></div>
            }
            @if (r.restLine && !r.restFirst) { <div class="rt">{{ r.restLine }}</div> }
            @if (!r.entries.length && !r.restLine) { <div class="none">Rien de prévu</div> }
            @for (n of r.notes; track n.id) { <div class="notep"><app-icon name="note" [size]="18" [stroke]="2" /><span>{{ n.text }}</span></div> }
          </div>
        </button>
      }
    </div>
    <div class="sum"><span>Cette semaine</span><strong>{{ jours(week().total) }}</strong></div>`,
})
export class WeekView {
  protected ui = inject(UiState);
  protected store = inject(PlanningStore);
  protected jours = jours;

  protected line(e: { slot: 'full' | 'am' | 'pm'; nurseId: string | null }): string {
    const nu = this.store.nurse(e.nurseId);
    return e.slot === 'full' ? (nu ? nu.name + ' · ' : '') + 'journée' : SLOT_LABEL[e.slot] + (nu ? ' · ' + nu.name : '');
  }

  protected week = computed(() => {
    const c = this.ui.cur(), mon = addDays(c, -dow(c)), sun = addDays(mon, 6), today = todayKey();
    const sub = mon.getMonth() === sun.getMonth()
      ? `${mon.getDate()} – ${sun.getDate()} ${MONTHS[sun.getMonth()]} ${sun.getFullYear()}`
      : `${mon.getDate()} ${mabbr(mon)} – ${sun.getDate()} ${mabbr(sun)} ${sun.getFullYear()}`;
    let total = 0;
    const rows = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(mon, i), k = key(d), es = this.store.entries(k), r = this.store.rest(k);
      es.forEach(e => (total += slotValue(e.slot)));
      const restLine = r && !(r === 'full' && es.length) ? restText(r) : '';
      return { k, day: d.getDate(), dow: DOW3[i], entries: es, restLine, restFirst: r === 'am' && !!restLine, fullRest: r === 'full' && !es.length,
        vac: !!this.store.vacation(k), today: k === today, notes: this.store.dayNotes(k) };
    });
    return { num: isoWeek(mon), sub, rows, total };
  });
}
