import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Actions } from '../core/actions';
import { AuthService } from '../core/auth.service';
import { Zone } from '../core/models';
import { PlanningStore } from '../core/planning.store';
import { UiState } from '../core/ui.state';
import { SheetHead } from './sheet-head';

/** Réglages : zone de vacances scolaires, déconnexion. */
@Component({
  selector: 'app-settings-sheet',
  imports: [SheetHead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <app-sheet-head title="Réglages" />
    <div class="f"><div class="lbl">Vacances scolaires</div>
      <div class="opts">
        @for (z of zones; track z[0]) { <button class="opt" [attr.aria-pressed]="store.zone() === z[0]" [disabled]="actions.busy()" (click)="actions.setZone(z[0])">{{ z[1] }}</button> }
      </div>
      <p class="hint">Dijon est en zone A. Dates officielles de l'Éducation nationale, mises à jour chaque année. Les jours fériés sont ceux de la France métropolitaine.</p>
    </div>
    <div class="f"><div class="lbl">Compte</div><p class="hint">Connectée avec {{ store.planning().user.email }}.</p></div>
    <button class="btn" (click)="logout()">Se déconnecter</button>`,
})
export class SettingsSheet {
  protected store = inject(PlanningStore);
  protected actions = inject(Actions);
  private auth = inject(AuthService);
  private ui = inject(UiState);
  protected zones: [Zone, string][] = [['A', 'Zone A'], ['B', 'Zone B'], ['C', 'Zone C'], ['none', 'Aucune']];

  protected logout(): void {
    this.auth.logout();
    this.store.reset();
    this.ui.reset();
  }
}
