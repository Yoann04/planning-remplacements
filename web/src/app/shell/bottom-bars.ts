import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Actions } from '../core/actions';
import { fmtRange, listDates } from '../core/dates';
import { PlanningStore } from '../core/planning.store';
import { restText } from '../core/rules';
import { UiState } from '../core/ui.state';
import { Icon } from '../shared/icon';

/** Barre de sélection (jours choisis, mode ajout) et onglets Calendrier / Mon activité. */
@Component({
  selector: 'app-bottom-bars',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <div id="bar">
      @if (ui.tab() === 'cal' && ui.view() === 'month' && !ui.add() && ui.pick().length) {
        @let n = ui.pick().length;
        <div class="selbar"><div class="seltxt"><strong>{{ n }} jour{{ n > 1 ? 's' : '' }} sélectionné{{ n > 1 ? 's' : '' }}</strong> · {{ listDates(ui.pick()) }}</div>
          <div class="row"><button class="btn" (click)="ui.pick.set([])">Annuler</button><button class="btn primary" (click)="ui.openSheet({ type: 'entry', date: null, dates: ui.pick().slice().sort(), id: null })">Ajouter</button></div></div>
      } @else if (ui.tab() === 'cal' && ui.add(); as a) {
        @if (ui.sel(); as ks) {
          <div class="selbar"><div class="seltxt"><strong>{{ ks.length }} jour{{ ks.length > 1 ? 's' : '' }}</strong> · {{ allRest() ? 'Retirer le repos' : selLabel() }} · {{ fmtRange(ks[0], ks[ks.length - 1]) }}</div>
            <div class="row"><button class="btn" (click)="ui.sel.set(null)">Annuler</button><button class="btn primary" [disabled]="actions.busy()" (click)="actions.commit(ks)">Valider</button></div></div>
        } @else {
          <div class="selbar one"><div class="seltxt">{{ a.rest || a.cab ? selLabel() : 'Choisissez un cabinet' }}</div><button class="btn primary" (click)="ui.endAdd()">Terminer</button></div>
        }
      }
    </div>
    @if (!ui.add() && !ui.pick().length) {
      <nav id="nav" aria-label="Navigation">
        <div class="tabs">
          <button class="tab" [attr.aria-current]="ui.tab() === 'cal' ? 'page' : null" (click)="ui.setTab('cal')"><app-icon name="cal" [size]="22" [stroke]="2.2" />Calendrier</button>
          <button class="tab" [attr.aria-current]="ui.tab() === 'act' ? 'page' : null" (click)="ui.setTab('act')"><app-icon name="chart" [size]="22" [stroke]="2.2" />Mon activité</button>
        </div>
      </nav>
    }`,
})
export class BottomBars {
  protected ui = inject(UiState);
  protected actions = inject(Actions);
  private store = inject(PlanningStore);
  protected listDates = listDates;
  protected fmtRange = fmtRange;

  protected selLabel = computed(() => {
    const a = this.ui.add();
    if (!a) return '';
    if (a.rest) return restText(a.slot);
    const nu = this.store.nurse(a.nurse);
    return (a.cab ? this.store.cab(a.cab).name : 'Cabinet à choisir') + (nu ? ' · ' + nu.name : '');
  });
  protected allRest = computed(() => { const a = this.ui.add(), ks = this.ui.sel(); return !!a?.rest && !!ks && ks.every(k => this.store.rest(k) === a.slot); });
}
