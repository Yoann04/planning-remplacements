import { Injectable, inject, signal } from '@angular/core';
import { ApiService, CabinetPayload } from './api.service';
import { dayLabel } from './dates';
import { Mutation, NoteScope, Slot, Zone } from './models';
import { PlanningStore } from './planning.store';
import { SLOT_LABEL, restClash, restText } from './rules';
import { UiState } from './ui.state';

const n = (r: Mutation, k: string) => Number(r[k] ?? 0);

/**
 * Actions de l'utilisatrice : appel à l'API puis message en français (avec « Annuler » quand c'est possible).
 * Les textes reprennent ceux du prototype validé.
 */
@Injectable({ providedIn: 'root' })
export class Actions {
  private api = inject(ApiService);
  private store = inject(PlanningStore);
  private ui = inject(UiState);
  /** Une action est en cours : évite les doubles envois. */
  readonly busy = signal(false);

  private async go(call: () => Promise<Mutation>, msg: (r: Mutation) => string | null, inline = false) {
    if (this.busy()) return { ok: false };
    this.busy.set(true);
    try {
      return await this.store.run(call, msg, { inline });
    } finally {
      this.busy.set(false);
    }
  }

  /** Erreur de saisie du mode ajout, avant tout envoi. */
  addError(): string | null {
    const a = this.ui.add();
    if (!a || a.rest || a.perso) return null;
    if (!a.cab) return "Choisissez d'abord un cabinet.";
    if (this.store.nursesOf(a.cab).length && !a.nurse) return "Choisissez l'infirmière remplacée.";
    return null;
  }

  /** Mode « Ajouter des jours » : applique le cabinet (ou le repos) choisi aux jours touchés ou glissés. */
  async commit(keys: string[]): Promise<void> {
    const a = this.ui.add();
    if (!a) return;
    const err = this.addError();
    if (err) { this.ui.sel.set(null); this.ui.toast(err); return; }
    if (a.perso) {
      await this.addEvents(keys, a.slot, a.label);
    } else if (a.rest) {
      const suf = a.slot === 'full' ? '' : ` (${SLOT_LABEL[a.slot].toLowerCase()})`;
      const first = keys.find(k => !restClash(this.store.entries(k), a.slot)) ?? keys[0];
      await this.go(() => this.api.setRests(keys, a.slot, true), r => {
        const set = n(r, 'set'), removed = n(r, 'removed'), skipped = n(r, 'skipped');
        if (!set && !removed) { this.ui.toast(keys.length > 1 ? 'Ces jours ont déjà un cabinet sur cette période.' : "Ce jour a déjà un cabinet sur cette période : retirez-le d'abord."); return null; }
        const extra = skipped ? ` (${skipped} déjà avec un cabinet, ignoré${skipped > 1 ? 's' : ''})` : '';
        return (removed
          ? (removed > 1 ? `Repos retiré sur ${removed} jours` : `Repos retiré : ${dayLabel(first)}`)
          : (set > 1 ? `${set} jours de repos voulu${suf}` : `${dayLabel(first)} : repos voulu${suf}`)) + extra;
      });
    } else {
      const who = this.store.nurse(a.nurse)?.name ?? this.store.cab(a.cab!).name;
      await this.go(() => this.api.addDays(keys, a.cab!, a.nurse, a.slot), r => {
        const added = n(r, 'added');
        if (!added) { this.ui.toast(`Déjà ajouté sur ${keys.length > 1 ? 'ces jours' : 'ce jour'}`); return null; }
        return `${keys.length === 1 ? dayLabel(keys[0]) + ' ajouté' : added + ' jours ajoutés'} · ${who}${n(r, 'restsRemoved') ? ' · repos retiré' : ''}`;
      });
    }
    this.ui.sel.set(null);
  }

  /** Rendez-vous perso sur un ou plusieurs jours (simple information, rien n'est retiré ni bloqué). */
  addEvents = (dates: string[], slot: Slot, label: string, inline = false) =>
    this.go(() => this.api.addEvents(dates, slot, label), r => {
      const n = Number(r['added'] ?? dates.length);
      return n > 1 ? `${n} rendez-vous perso ajoutés` : `${dayLabel(dates[0])} : rendez-vous perso`;
    }, inline);
  saveEvent = (id: string, slot: Slot, label: string) => this.go(() => this.api.updateEvent(id, slot, label), () => 'Rendez-vous perso modifié', true);
  deleteEvent = (id: string) => this.go(() => this.api.deleteEvent(id), () => 'Rendez-vous perso supprimé', true);

  /** Fenêtre « Ajouter N jours » (jours vides sélectionnés dans la vue mois). */
  async addToPicked(dates: string[], st: { cab: string | null; nurse: string | null; slot: Slot; rest: boolean; perso?: boolean; label?: string }) {
    const pl = dates.length > 1 ? 's' : '';
    if (st.perso) return this.addEvents(dates, st.slot, st.label ?? '', true);
    if (st.rest) {
      return this.go(() => this.api.setRests(dates, st.slot, false), r => {
        const set = n(r, 'set'), sk = n(r, 'skipped');
        return (set ? `${set} jour${set > 1 ? 's' : ''} de repos voulu${st.slot === 'full' ? '' : ' (' + SLOT_LABEL[st.slot].toLowerCase() + ')'}` : 'Aucun repos ajouté')
          + (sk ? ` · ${sk} ignoré${sk > 1 ? 's' : ''} (cabinet déjà présent)` : '');
      }, true);
    }
    const who = this.store.nurse(st.nurse)?.name ?? this.store.cab(st.cab!).name;
    return this.go(() => this.api.addDays(dates, st.cab!, st.nurse, st.slot),
      r => `${dates.length} jour${pl} ajouté${pl} · ${who}${n(r, 'restsRemoved') ? ' · repos retiré' : ''}`, true);
  }

  saveEntry(date: string, id: string | null, cab: string, nurse: string | null, slot: Slot) {
    return id
      ? this.go(() => this.api.updateDay(id, cab, nurse, slot), r => 'Jour modifié' + (r['restRemoved'] ? ' · repos retiré' : ''), true)
      : this.go(() => this.api.addDays([date], cab, nurse, slot), r => (n(r, 'added') ? 'Cabinet ajouté' : 'Déjà ajouté sur ce jour') + (n(r, 'restsRemoved') ? ' · repos retiré' : ''), true);
  }
  deleteEntry = (id: string) => this.go(() => this.api.deleteDay(id), () => 'Jour supprimé', true);

  saveRest = (date: string, slot: Slot) => this.go(() => this.api.setRest(date, slot), () => restText(slot) + ' noté', true);
  deleteRest = (date: string) => this.go(() => this.api.deleteRest(date), () => 'Repos supprimé', true);

  addNote = (scope: NoteScope, text: string, target: { date?: string; cabinetId?: string; nurseId?: string }, inline = false) =>
    this.go(() => this.api.createNote({ scope, text, ...target }), () => 'Pense-bête ajouté', inline);
  saveNote = (id: string, text: string) => this.go(() => this.api.updateNote(id, text), () => 'Pense-bête modifié', true);
  deleteNote = (id: string) => this.go(() => this.api.deleteNote(id), () => 'Pense-bête supprimé', true);

  saveCabinet = (id: string | null, c: CabinetPayload) =>
    this.go(() => (id ? this.api.updateCabinet(id, c) : this.api.createCabinet(c)), () => 'Cabinet enregistré : ' + c.name.trim(), true);
  deleteCabinet = (id: string) => this.go(() => this.api.deleteCabinet(id), () => 'Cabinet supprimé', true);

  /** Mettre en veille / réactiver (annulable). Un cabinet mis en veille quitte aussi le mode « Ajouter des jours ». */
  async setCabinetActive(id: string, active: boolean) {
    const name = this.store.cab(id).name;
    const r = await this.go(() => this.api.setCabinetActive(id, active), () => (active ? 'Cabinet réactivé : ' : 'Cabinet mis en veille : ') + name);
    const add = this.ui.add();
    if (r.ok && !active && add?.cab === id) this.ui.add.set({ ...add, cab: null, nurse: null });
    return r;
  }

  setZone = (zone: Zone) => this.go(() => this.api.setZone(zone), () => null);

}
