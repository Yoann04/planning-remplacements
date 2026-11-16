import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * Mises à jour de l'application installée (PWA). Le service worker garde une copie de l'application pour l'ouvrir
 * hors connexion : une nouvelle version se télécharge en arrière-plan, mais ne s'affichait qu'à l'ouverture suivante.
 * Ici, dès qu'elle est prête, on le dit (« Nouvelle version disponible ») et l'utilisatrice choisit quand recharger,
 * pour ne jamais couper une saisie en cours.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdate {
  private sw = inject(SwUpdate);
  readonly ready = signal(false);

  constructor() {
    if (!this.sw.isEnabled) return; // pas de service worker en développement
    this.sw.versionUpdates.pipe(filter(e => e.type === 'VERSION_READY')).subscribe(() => this.ready.set(true));
    // Copie locale abîmée (rare) : seul un rechargement complet répare.
    this.sw.unrecoverable.subscribe(() => location.reload());
    // Sur iPhone, l'application reste ouverte en arrière-plan : on vérifie quand elle revient à l'écran, et toutes les 30 min.
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.check(); });
    setInterval(() => this.check(), 30 * 60 * 1000);
  }

  private check(): void {
    this.sw.checkForUpdate().catch(() => { /* hors connexion : on réessaiera */ });
  }

  /** « Mettre à jour » : passe à la nouvelle version et recharge. */
  async apply(): Promise<void> {
    try { await this.sw.activateUpdate(); } catch { /* on recharge quand même */ }
    location.reload();
  }
}
