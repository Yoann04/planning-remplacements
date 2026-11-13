import { Injectable, signal } from '@angular/core';
import { addDays, parseKey, startOfDay } from './dates';
import { Slot } from './models';

export type Tab = 'cal' | 'act';
export type View = 'year' | 'month' | 'week' | 'day';
export type Period = 'month' | 'year' | 'all';

/** Mode « Ajouter des jours » : cabinet (ou repos) choisi d'abord, puis toucher ou glisser sur les jours. */
export interface AddState { cab: string | null; nurse: string | null; slot: Slot; rest: boolean }

/** Fenêtre du bas actuellement ouverte. */
export type Sheet =
  | { type: 'cab'; id: string | null; ret: 'add' | null }
  | { type: 'entry'; date: string | null; dates: string[] | null; id: string | null }
  | { type: 'rest'; date: string; editing: boolean }
  | { type: 'note'; id: string }
  | { type: 'settings' };

interface Back { tab: Tab; view: View; cur: Date; actCab: string | null; cabPeriod: 'month' | 'year'; cabNurse: string; period: Period; scroll: number }

/** État de l'écran (onglet, vue, jour courant, sélection, fenêtre ouverte, message). Aucune donnée métier ici. */
@Injectable({ providedIn: 'root' })
export class UiState {
  readonly tab = signal<Tab>('cal');
  readonly view = signal<View>('month');
  readonly cur = signal<Date>(startOfDay(new Date()));
  readonly back = signal<Back | null>(null);
  readonly add = signal<AddState | null>(null);
  /** Plage glissée en mode « Ajouter des jours », en attente de « Valider ». */
  readonly sel = signal<string[] | null>(null);
  /** Jours vides touchés dans la vue mois (sélection multiple), avant « Ajouter ». */
  readonly pick = signal<string[]>([]);
  readonly sheet = signal<Sheet | null>(null);
  readonly toastState = signal<{ msg: string; undoId: string | null } | null>(null);
  readonly period = signal<Period>('month');
  readonly actCab = signal<string | null>(null);
  readonly cabPeriod = signal<'month' | 'year'>('month');
  readonly cabNurse = signal<string>('all');
  /** Défilement à appliquer à la zone principale après le prochain affichage (0 = haut de page). */
  readonly scrollTo = signal<number | null>(null);
  scrollTop = () => 0;

  private timer: ReturnType<typeof setTimeout> | undefined;

  toast(msg: string, undoId: string | null = null): void {
    clearTimeout(this.timer);
    this.toastState.set({ msg, undoId });
    this.timer = setTimeout(() => this.toastState.set(null), 6000);
  }
  hideToast(): void {
    clearTimeout(this.timer);
    this.toastState.set(null);
  }

  openSheet(s: Sheet): void {
    this.hideToast();
    this.sheet.set(s);
  }
  closeSheet(): void {
    this.sheet.set(null);
  }

  private snapBack(): Back {
    return { tab: this.tab(), view: this.view(), cur: new Date(this.cur()), actCab: this.actCab(), cabPeriod: this.cabPeriod(), cabNurse: this.cabNurse(), period: this.period(), scroll: this.scrollTop() };
  }

  setTab(t: Tab): void {
    this.back.set(null);
    this.tab.set(t);
    this.add.set(null);
    this.sel.set(null);
    this.pick.set([]);
    this.actCab.set(null);
    this.scrollTo.set(0);
  }

  setView(v: View): void {
    if (v === 'day' && this.view() !== 'day') this.back.set(this.snapBack());
    else if (v !== 'day') this.back.set(null);
    this.view.set(v);
    this.pick.set([]);
    this.scrollTo.set(0);
  }

  /** Flèches précédent / suivant : un an, un mois, une semaine ou un jour selon l'écran. */
  nav(n: number): void {
    const c = this.cur();
    if (this.tab() === 'act') {
      const per = this.actCab() ? this.cabPeriod() : this.period();
      this.cur.set(per === 'year' ? new Date(c.getFullYear() + n, c.getMonth(), 1) : new Date(c.getFullYear(), c.getMonth() + n, 1));
    } else {
      const v = this.view();
      this.cur.set(v === 'year' ? new Date(c.getFullYear() + n, c.getMonth(), 1)
        : v === 'month' ? new Date(c.getFullYear(), c.getMonth() + n, 1)
          : addDays(c, v === 'week' ? 7 * n : n));
    }
    this.sel.set(null);
    this.scrollTo.set(0);
  }

  setMonth(m: number): void { const c = this.cur(); this.cur.set(new Date(c.getFullYear(), m, 1)); }
  setYear(y: number): void { const c = this.cur(); this.cur.set(new Date(y, c.getMonth(), 1)); }

  /** Ouvre la vue jour ; « Retour » ramènera à l'écran d'origine. */
  openDay(k: string): void {
    this.back.set(this.snapBack());
    this.cur.set(parseKey(k));
    this.view.set('day');
    this.tab.set('cal');
    this.actCab.set(null);
    this.pick.set([]);
    this.scrollTo.set(0);
  }

  openMonth(m: number): void {
    this.back.set(null);
    this.cur.set(new Date(this.cur().getFullYear(), m, 1));
    this.view.set('month');
    this.pick.set([]);
    this.scrollTo.set(0);
  }

  goBack(): void {
    const b = this.back();
    if (!b) return;
    this.tab.set(b.tab); this.view.set(b.view); this.cur.set(b.cur); this.actCab.set(b.actCab);
    this.cabPeriod.set(b.cabPeriod); this.cabNurse.set(b.cabNurse); this.period.set(b.period);
    this.back.set(null);
    this.pick.set([]);
    this.scrollTo.set(b.scroll);
  }

  togglePick(k: string): void {
    this.pick.update(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]));
  }

  startAdd(): void {
    this.add.set({ cab: null, nurse: null, slot: 'full', rest: false });
    this.sel.set(null);
    this.pick.set([]);
    this.scrollTo.set(0);
  }
  endAdd(): void {
    this.add.set(null);
    this.sel.set(null);
  }

  setPeriod(p: Period): void {
    this.period.set(p);
    const c = this.cur();
    this.cur.set(new Date(c.getFullYear(), c.getMonth(), 1));
    this.scrollTo.set(0);
  }

  openCabinet(id: string): void {
    this.actCab.set(id);
    this.cabPeriod.set(this.period() === 'year' ? 'year' : 'month');
    this.cabNurse.set('all');
    const c = this.cur();
    this.cur.set(new Date(c.getFullYear(), c.getMonth(), 1));
    this.scrollTo.set(0);
  }

  reset(): void {
    this.setTab('cal');
    this.view.set('month');
    this.cur.set(startOfDay(new Date()));
    this.sheet.set(null);
    this.hideToast();
  }
}
