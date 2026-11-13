import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { UiState } from '../core/ui.state';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-sheet-head',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `<div class="sh-h"><h2>{{ title() }}</h2><button class="btn" (click)="ui.closeSheet()"><app-icon name="x" [size]="18" [stroke]="2.8" />Fermer</button></div>`,
})
export class SheetHead {
  protected ui = inject(UiState);
  readonly title = input.required<string>();
}

/** Suppression en deux temps : bouton « Supprimer … », puis confirmation. Jamais de croix rapide. */
@Component({
  selector: 'app-delete-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    @if (confirming()) {
      <div class="card"><p><strong>{{ question() }}</strong></p>
        <div class="row"><button class="btn" (click)="confirming.set(false)">Non, garder</button><button class="btn danger primary" (click)="confirmed.emit()">Supprimer</button></div></div>
    } @else {
      <button class="btn text danger" (click)="confirming.set(true)">{{ label() }}</button>
    }`,
})
export class DeleteBlock {
  readonly label = input.required<string>();
  readonly question = input.required<string>();
  readonly confirmed = output<void>();
  protected confirming = signal(false);
}
