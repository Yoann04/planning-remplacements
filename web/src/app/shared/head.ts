import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { PageTurn } from '../core/page-turn';
import { UiState } from '../core/ui.state';
import { Icon } from './icon';

/** En-tête : précédent, titre (et sous-titre), suivant. */
@Component({
  selector: 'app-head',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <header class="head">
      <button class="iconbtn" [class.ghost]="hideNav()" (click)="turn.go(-1)" aria-label="Précédent"><app-icon name="prev" [size]="22" /></button>
      <div class="ht"><h1>{{ title() }}</h1>@if (sub()) {<div class="hs">{{ sub() }}</div>}<ng-content /></div>
      <button class="iconbtn" [class.ghost]="hideNav()" (click)="turn.go(1)" aria-label="Suivant"><app-icon name="next" [size]="22" /></button>
    </header>`,
})
export class Head {
  protected ui = inject(UiState);
  protected turn = inject(PageTurn);
  readonly title = input.required<string>();
  readonly sub = input('');
  readonly hideNav = input(false);
}
