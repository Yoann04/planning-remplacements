import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Actions } from '../core/actions';
import { MONTHS, addDays, cap, dayLabel, dow, key, monthRange, rangeKeys, todayKey } from '../core/dates';
import { PlanningStore } from '../core/planning.store';
import { SLOT_LABEL, dayTotals, eventLine, eventText, jours, num, restText } from '../core/rules';
import { UiState } from '../core/ui.state';
import { Chip } from '../shared/chip';
import { Head } from '../shared/head';
import { Icon } from '../shared/icon';
import { Legend } from '../shared/legend';
import { PickState, Pickers } from '../shared/pickers';
import { ViewSwitch } from '../shared/view-switch';

/**
 * Vue mois. Hors mode ajout : toucher un jour rempli ouvre son détail, toucher un jour vide le sélectionne.
 * En mode « Ajouter des jours » : toucher un jour l'ajoute, glisser le doigt choisit une plage à valider.
 */
@Component({
  selector: 'app-month-view',
  imports: [Head, ViewSwitch, Chip, Icon, Pickers, Legend],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <app-head [title]="title()" />
    @if (!ui.add()) { <app-view-switch /> }
    <div class="dows" aria-hidden="true">@for (x of ['L','M','M','J','V','S','D']; track $index) {<span>{{ x }}</span>}</div>
    <div class="grid" [class.adding]="!!ui.add()"
         (pointerdown)="down($event)" (pointermove)="move($event)" (pointerup)="up()" (pointercancel)="drag.set(null)">
      @for (c of cells(); track c.k) {
        @if (c.out) {
          <div class="cell out" aria-hidden="true"><span class="num">{{ c.day }}</span></div>
        } @else {
          <button [class]="c.cls" [class.sel]="isSel(c.k)" [attr.data-k]="c.k" [attr.aria-label]="c.label"
                  [attr.aria-pressed]="!ui.add() && c.empty ? ui.pick().includes(c.k) : null" (click)="tap($event, c.k, c.empty)">
            <span class="num">{{ c.day }}</span>
            @if (c.fe) { <span class="fer">Férié</span> }
            @for (e of c.entries.slice(0, 2); track e.id) { <app-chip [entry]="e" /> }
            @if (c.entries.length > 2) { <span class="more">+{{ c.entries.length - 2 }}</span> }
          </button>
        }
      }
    </div>
    <div class="sum"><strong>{{ jours(totals().total) }}</strong><span>{{ num(totals().done) }} fait{{ totals().done >= 2 ? 's' : '' }} · {{ num(totals().todo) }} prévu{{ totals().todo >= 2 ? 's' : '' }}</span></div>
    @if (ui.add(); as a) {
      <section class="panel" aria-label="Ajouter des jours">
        <app-pickers [state]="a" [allowRest]="true" [allowPerso]="true" [allowNewCabinet]="true" [addMode]="true" (picked)="setAdd($event)" (newCabinet)="ui.openSheet({ type: 'cab', id: null, ret: 'add' })" />
        @if (!a.rest && !a.perso) { <p class="hint">Touchez un jour pour l'ajouter, ou glissez le doigt sur plusieurs jours puis validez.</p> }
      </section>
    } @else if (!store.cabinets().length) {
      <div class="empty"><p><strong>Aucun cabinet pour l'instant.</strong> Créez votre premier cabinet, puis ajoutez vos jours.</p>
        <button class="btn primary" (click)="ui.openSheet({ type: 'cab', id: null, ret: null })"><app-icon name="plus" [stroke]="2.6" />Créer un cabinet</button></div>
    } @else {
      <app-legend [range]="range()" />
      <p class="hint">Touchez un jour vide pour le sélectionner (vous pouvez en choisir plusieurs), puis « Ajouter ». Touchez un jour déjà rempli pour le modifier.</p>
      @if (!ui.pick().length) { <button class="btn primary big" (click)="ui.startAdd()"><app-icon name="plus" [stroke]="2.6" />Ajouter des jours</button> }
    }`,
})
export class MonthView {
  protected ui = inject(UiState);
  protected store = inject(PlanningStore);
  private actions = inject(Actions);
  protected jours = jours;
  protected num = num;
  /** Plage en cours de glisser (mode ajout). */
  protected drag = signal<{ a: string; b: string } | null>(null);
  private dragSet = computed(() => { const d = this.drag(); return d ? new Set(rangeKeys(d.a, d.b)) : null; });

  protected title = computed(() => cap(MONTHS[this.ui.cur().getMonth()]) + ' ' + this.ui.cur().getFullYear());
  protected range = computed(() => monthRange(this.ui.cur()));
  protected totals = computed(() => { const [f, t] = this.range(); return dayTotals(this.store.planning().days, f, t); });

  protected cells = computed(() => {
    const cur = this.ui.cur(), y = cur.getFullYear(), m = cur.getMonth(), today = todayKey();
    const first = new Date(y, m, 1), lead = dow(first), n = new Date(y, m + 1, 0).getDate();
    const weeks = Math.ceil((lead + n) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => {
      const d = addDays(first, i - lead), k = key(d);
      if (d.getMonth() !== m) return { k, day: d.getDate(), out: true, entries: [], cls: '', label: '', fe: null, empty: false };
      const es = this.store.entries(k), r = this.store.rest(k), fe = this.store.ferie(k), va = this.store.vacation(k), evs = this.store.events(k);
      const label = dayLabel(k)
        + (es.length ? ' : ' + es.map(e => this.store.cab(e.cabinetId).name + (e.slot === 'full' ? '' : ' ' + SLOT_LABEL[e.slot].toLowerCase())).join(', ') : r ? '' : ' : vide')
        + (r ? (es.length ? ', ' : ' : ') + restText(r).toLowerCase() : '') + (fe ? ' · jour férié : ' + fe : '') + (va ? ' · vacances scolaires : ' + va : '')
        + (evs.length ? ' · rendez-vous perso : ' + evs.map(eventText).join(', ') : '');
      const ev = eventLine(evs);
      const cls = 'cell' + (k === today ? ' today' : '') + (r === 'full' && !es.length ? ' rest' : '') + (r && r !== 'full' ? ' rest-' + r : '') + (va ? ' vac' : '') + (ev ? ' ev-' + ev : '');
      return { k, day: d.getDate(), out: false, entries: es, cls, label, fe, empty: !es.length && !r && !evs.length };
    });
  });

  protected isSel(k: string): boolean {
    const ds = this.dragSet();
    if (ds) return ds.has(k);
    return !!this.ui.sel()?.includes(k) || this.ui.pick().includes(k);
  }

  protected setAdd(st: PickState): void {
    this.ui.add.set(st);
    this.ui.sel.set(null);
  }

  /** Toucher un jour hors mode ajout ; en mode ajout, seul le clavier (detail = 0) passe par ici. */
  protected tap(ev: MouseEvent, k: string, empty: boolean): void {
    if (this.ui.add()) {
      if (ev.detail === 0) this.withNotice([k], () => this.actions.commit([k]));
      return;
    }
    this.withNotice([k], () => this.tapDay(k, empty));
  }

  /**
   * Touchée d'une case qui a un rendez-vous perso : avertissement à valider avec « OK », puis le geste
   * continue normalement (sélection, ajout, ouverture du jour). Rien n'est bloqué.
   */
  private withNotice(keys: string[], then: () => void): void {
    const hits = keys.filter(k => this.store.events(k).length);
    if (!hits.length) { then(); return; }
    const evs = (k: string) => this.store.events(k).map(eventText);
    if (hits.length === 1) this.ui.notify('Rendez-vous perso · ' + dayLabel(hits[0]).toLowerCase(), evs(hits[0]), then);
    else this.ui.notify('Rendez-vous perso sur ces jours', hits.map(k => `${cap(dayLabel(k))} : ${evs(k).join(', ')}`), then);
  }

  private tapDay(k: string, empty: boolean): void {
    if (!empty) {
      if (this.ui.pick().length) { this.ui.toast("Ce jour est déjà rempli. Terminez ou annulez la sélection d'abord."); return; }
      this.ui.openDay(k);
      return;
    }
    this.ui.togglePick(k);
  }

  private keyAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('.grid .cell[data-k]');
    return el?.dataset['k'] ?? null;
  }

  protected down(e: PointerEvent): void {
    if (!this.ui.add()) return;
    const k = (e.target as HTMLElement).closest<HTMLElement>('.cell[data-k]')?.dataset['k'];
    if (!k) return;
    e.preventDefault();
    this.ui.sel.set(null);
    this.drag.set({ a: k, b: k });
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* rien */ }
  }

  protected move(e: PointerEvent): void {
    const d = this.drag();
    if (!d) return;
    const k = this.keyAt(e.clientX, e.clientY);
    if (k && k !== d.b) this.drag.set({ a: d.a, b: k });
  }

  protected up(): void {
    const d = this.drag();
    if (!d) return;
    this.drag.set(null);
    const err = this.actions.addError();
    if (err) { this.ui.toast(err); return; }
    if (d.a === d.b) this.withNotice([d.a], () => this.actions.commit([d.a]));
    else { const ks = rangeKeys(d.a, d.b); this.withNotice(ks, () => this.ui.sel.set(ks)); }
  }
}
