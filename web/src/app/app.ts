import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, effect, inject, viewChild } from '@angular/core';
import { ActivityView } from './activity/activity-view';
import { CabinetView } from './activity/cabinet-view';
import { DayView } from './calendar/day-view';
import { MonthView } from './calendar/month-view';
import { WeekView } from './calendar/week-view';
import { YearView } from './calendar/year-view';
import { AuthService } from './core/auth.service';
import { PlanningStore } from './core/planning.store';
import { Point, swipeStep } from './core/swipe';
import { UiState } from './core/ui.state';
import { BottomBars } from './shell/bottom-bars';
import { Login } from './shell/login';
import { SheetHost } from './shell/sheet-host';

/** Coquille : connexion, puis une colonne façon iPhone (contenu qui défile, barres du bas, message, fenêtre). */
@Component({
  selector: 'app-root',
  imports: [Login, MonthView, YearView, WeekView, DayView, ActivityView, CabinetView, BottomBars, SheetHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="app">
      <main id="main" #main [class.swipe]="ui.tab() === 'cal'"
            (touchstart)="swipeStart($event)" (touchend)="swipeEnd($event)" (touchcancel)="swipeFrom = null">
        @if (!auth.loggedIn()) {
          <app-login />
        } @else if (!store.loaded()) {
          <div class="loading">
            @if (store.loadError()) { <p>{{ store.loadError() }}</p><button class="btn" (click)="store.load()">Réessayer</button> }
            @else { <p>Chargement de votre planning…</p> }
          </div>
        } @else if (ui.tab() === 'act') {
          @if (ui.actCab()) { <app-cabinet-view /> } @else { <app-activity-view /> }
        } @else {
          @switch (ui.view()) {
            @case ('year') { <app-year-view /> }
            @case ('month') { <app-month-view /> }
            @case ('week') { <app-week-view /> }
            @case ('day') { <app-day-view /> }
          }
        }
      </main>
      @if (auth.loggedIn() && store.loaded()) { <app-bottom-bars /> }
    </div>
    <div id="toast" role="status" aria-live="polite">
      @if (ui.toastState(); as t) {
        <div class="toast"><span>{{ t.msg }}</span>@if (t.undoId) { <button (click)="store.undo(t.undoId)">Annuler</button> }</div>
      }
    </div>
    <app-sheet-host />
    @if (ui.notice(); as n) {
      <div class="scrim" style="z-index:59" (click)="ui.closeNotice()"></div>
      <div class="notice" role="alertdialog" aria-modal="true" aria-labelledby="noticeT">
        <h2 id="noticeT">{{ n.title }}</h2>
        @for (l of n.lines; track $index) { <p>{{ l }}</p> }
        <button class="btn primary big" (click)="ui.closeNotice()" autofocus>OK</button>
      </div>
    }`,
})
export class App {
  protected auth = inject(AuthService);
  protected store = inject(PlanningStore);
  protected ui = inject(UiState);
  private main = viewChild.required<ElementRef<HTMLElement>>('main');
  /** Point de départ du doigt pour le balayage (un seul doigt). */
  protected swipeFrom: Point | null = null;

  constructor() {
    // Échap ferme l'avertissement comme « OK ».
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && this.ui.notice()) this.ui.closeNotice(); });
    // Connexion → chargement du planning ; déconnexion (ou jeton expiré) → tout est vidé.
    effect(() => {
      if (this.auth.loggedIn()) void this.store.load();
      else { this.store.reset(); this.ui.reset(); }
    });
    // Le message du bas remonte au-dessus de la barre de sélection.
    effect(() => document.body.classList.toggle('adding', !!this.ui.add() || this.ui.pick().length > 0));
    this.ui.scrollTop = () => this.main().nativeElement.scrollTop;
    // Défilement demandé par l'état (haut de page à chaque changement d'écran, position d'origine pour « Retour »).
    afterRenderEffect(() => {
      const y = this.ui.scrollTo();
      if (y !== null) { this.main().nativeElement.scrollTop = y; this.ui.scrollTo.set(null); }
    });
  }

  protected swipeStart(e: TouchEvent): void {
    this.swipeFrom = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }

  /** Balayage horizontal dans le calendrier : même effet que les flèches précédent / suivant. */
  protected swipeEnd(e: TouchEvent): void {
    const from = this.swipeFrom, t = e.changedTouches[0];
    this.swipeFrom = null;
    if (!from || !t) return;
    const step = swipeStep(from, { x: t.clientX, y: t.clientY }, window.innerWidth,
      { tab: this.ui.tab(), sheetOpen: !!this.ui.sheet(), adding: !!this.ui.add() });
    if (!step) return;
    this.ui.nav(step);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.main().nativeElement.animate(
        [{ transform: `translateX(${step * 36}px)`, opacity: 0.4 }, { transform: 'none', opacity: 1 }],
        { duration: 180, easing: 'ease-out' });
    }
  }
}
