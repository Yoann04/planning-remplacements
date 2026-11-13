import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiState, View } from '../core/ui.state';
import { Icon } from './icon';

/** Choix de la vue (Année, Mois, Semaine, Jour) et bouton « Retour » de la vue jour. */
@Component({
  selector: 'app-view-switch',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <div class="seg" role="group" aria-label="Type de vue">
      @for (v of views; track v[0]) {
        <button [attr.aria-pressed]="ui.view() === v[0]" (click)="ui.setView(v[0])">{{ v[1] }}</button>
      }
    </div>
    @if (ui.view() === 'day' && ui.back() && !ui.add()) {
      <div class="navbtns"><button class="btn sm" (click)="ui.goBack()"><app-icon name="prev" [size]="22" />Retour</button></div>
    }`,
})
export class ViewSwitch {
  protected ui = inject(UiState);
  protected views: [View, string][] = [['year', 'Année'], ['month', 'Mois'], ['week', 'Semaine'], ['day', 'Jour']];
}
