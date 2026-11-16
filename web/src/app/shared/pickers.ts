import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Slot } from '../core/models';
import { PlanningStore } from '../core/planning.store';
import { SLOT_LABEL, addChoices } from '../core/rules';
import { FormsModule } from '@angular/forms';
import { Icon } from './icon';

/** rest = repos voulu ; perso = rendez-vous perso (label : texte facultatif). */
export interface PickState { cab: string | null; nurse: string | null; slot: Slot; rest: boolean; perso: boolean; label: string }

/** Choix « 1 · Cabinet, 2 · Infirmière remplacée, 3 · Durée » (ou repos voulu, ou rendez-vous perso). Utilisé par le mode ajout et par la fenêtre d'ajout. */
@Component({
  selector: 'app-pickers',
  imports: [Icon, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    @let st = state();
    <div class="f">
      <div class="lbl">{{ st.rest || st.perso ? 'Cabinet' : '1 · Cabinet' }}</div>
      <div class="opts">
        @for (c of choices(); track c.id) {
          <button class="opt cab kc" [style.--kc]="c.color" [attr.aria-pressed]="st.cab === c.id && !st.rest && !st.perso" (click)="pickCab(c.id)"><span class="chip">{{ c.code }}</span>{{ c.name }}</button>
        } @empty { <span class="hint">{{ store.cabinets().length ? 'Tous vos cabinets sont en veille. Réactivez-en un dans Mon activité, ou créez-en un.' : 'Aucun cabinet. Créez-en un.' }}</span> }
        @if (allowRest()) { <button class="opt restopt" [attr.aria-pressed]="st.rest" (click)="change.emit({ ...st, rest: !st.rest, perso: false })">Repos voulu</button> }
        @if (allowPerso()) { <button class="opt persoopt" [attr.aria-pressed]="st.perso" (click)="change.emit({ ...st, perso: !st.perso, rest: false })">RDV perso</button> }
        @if (allowNewCabinet()) { <button class="opt dash" (click)="newCabinet.emit()"><app-icon name="plus" [stroke]="2.6" />Nouveau cabinet</button> }
      </div>
    </div>
    @if (st.perso) {
      <div class="f"><div class="lbl">Durée du rendez-vous</div>
        <div class="seg" role="group" aria-label="Durée du rendez-vous">
          @for (s of slots; track s) { <button [attr.aria-pressed]="st.slot === s" (click)="change.emit({ ...st, slot: s })">{{ label[s] }}</button> }
        </div>
      </div>
      <div class="f"><label class="lbl" for="pkLabel">Texte <span>(facultatif)</span></label>
        <input id="pkLabel" type="text" [ngModel]="st.label" (ngModelChange)="change.emit({ ...st, label: $event })" placeholder="RDV perso" autocomplete="off" maxlength="80">
        <p class="hint">{{ addMode() ? 'Touchez ou glissez sur les jours concernés. ' : '' }}Simple information : vous pourrez quand même travailler ce jour-là. Pas de détail médical.</p>
      </div>
    } @else if (st.rest) {
      <div class="f"><div class="lbl">Durée du repos</div>
        <div class="seg" role="group" aria-label="Durée du repos">
          @for (s of slots; track s) { <button [attr.aria-pressed]="st.slot === s" (click)="change.emit({ ...st, slot: s })">{{ label[s] }}</button> }
        </div>
      </div>
      <p class="hint">{{ addMode() ? 'Touchez un jour, ou glissez sur plusieurs jours, pour marquer les jours où vous ne voulez pas travailler. Refaites-le pour les retirer.' : 'Ces jours seront marqués « repos voulu ».' }}</p>
    } @else {
      <div class="f"><div class="lbl">2 · Infirmière remplacée</div>
        <div class="opts">
          @if (!st.cab) { <span class="hint">Choisissez d'abord un cabinet.</span> }
          @else {
            @for (n of nurses(); track n.id) {
              <button class="opt" [attr.aria-pressed]="st.nurse === n.id" (click)="change.emit({ ...st, nurse: n.id })">{{ n.name }}</button>
            } @empty { <span class="hint">Aucune infirmière dans ce cabinet. Ajoutez-en dans Mon activité, en modifiant le cabinet.</span> }
          }
        </div>
      </div>
      <div class="f"><div class="lbl">3 · Durée</div>
        <div class="seg" role="group" aria-label="Durée">
          @for (s of slots; track s) { <button [attr.aria-pressed]="st.slot === s" (click)="change.emit({ ...st, slot: s })">{{ label[s] }}</button> }
        </div>
      </div>
    }`,
})
export class Pickers {
  protected store = inject(PlanningStore);
  readonly state = input.required<PickState>();
  readonly allowRest = input(false);
  readonly allowNewCabinet = input(false);
  readonly allowPerso = input(false);
  readonly addMode = input(false);
  /** Jour modifié : son cabinet reste proposé même s'il est en veille. */
  readonly keepCab = input<string | null>(null);
  readonly change = output<PickState>();
  readonly newCabinet = output<void>();
  protected slots: Slot[] = ['full', 'am', 'pm'];
  protected label = SLOT_LABEL;
  /** Cabinets en veille exclus (sauf celui du jour qu'on modifie). */
  protected choices = computed(() => addChoices(this.store.cabinets(), this.keepCab()));
  protected nurses = computed(() => this.store.nursesOf(this.state().cab));

  /** Choisir un cabinet présélectionne son infirmière s'il n'en a qu'une. */
  protected pickCab(id: string): void {
    const st = this.state();
    const ns = this.store.nursesOf(id);
    this.change.emit({ ...st, cab: id, rest: false, perso: false, nurse: st.cab === id ? st.nurse : ns.length === 1 ? ns[0].id : null });
  }
}
