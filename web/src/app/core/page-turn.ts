import { Injectable, inject } from '@angular/core';
import { UiState } from './ui.state';

/** Durée du cube (ms) : assez courte pour ne jamais ralentir la consultation. */
export const CUBE_MS = 380;

/**
 * Face d'un cube de largeur `width`, tournée de `deg` degrés autour de son axe vertical (centre du cube).
 * 0 = face de devant ; -90 = partie à gauche ; 90 = arrive de la droite.
 */
export const cubeFace = (width: number, deg: number) =>
  `perspective(${Math.round(width * 2.5)}px) translateZ(${-width / 2}px) rotateY(${deg}deg) translateZ(${width / 2}px)`;

/**
 * Changement de période dans le calendrier (flèches et balayage) avec l'animation « cube qui roule » :
 * une copie figée de la page actuelle et la nouvelle page sont deux faces d'un cube qui tourne.
 * Sans animation (« Mon activité », réglage « réduire les animations », animation déjà en cours) : changement direct.
 */
@Injectable({ providedIn: 'root' })
export class PageTurn {
  private ui = inject(UiState);
  /** Zone qui défile (#main), fournie par la coquille. */
  main: HTMLElement | null = null;
  private busy = false;

  go(dir: 1 | -1): void {
    const m = this.main;
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!m || this.ui.tab() !== 'cal' || reduce || this.busy || typeof m.animate !== 'function') {
      this.ui.nav(dir);
      return;
    }
    const r = m.getBoundingClientRect();
    // Ancienne face : copie figée de la page, posée exactement par-dessus.
    const old = m.cloneNode(true) as HTMLElement;
    old.removeAttribute('id');
    old.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    old.className = 'cube-old';
    old.setAttribute('aria-hidden', 'true');
    old.inert = true;
    Object.assign(old.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    document.body.appendChild(old);
    old.scrollTop = m.scrollTop;

    this.ui.nav(dir);
    this.busy = true;
    m.classList.add('cube-new');
    const o: KeyframeAnimationOptions = { duration: CUBE_MS, easing: 'cubic-bezier(.3,.7,.3,1)' };
    const a = old.animate([{ transform: cubeFace(r.width, 0) }, { transform: cubeFace(r.width, -dir * 90) }], { ...o, fill: 'forwards' });
    const b = m.animate([{ transform: cubeFace(r.width, dir * 90) }, { transform: cubeFace(r.width, 0) }], o);
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      a.cancel();
      b.cancel();
      old.remove();
      m.classList.remove('cube-new');
      this.busy = false;
    };
    Promise.all([a.finished, b.finished]).then(end, end);
    // Sécurité : animation suspendue (application passée en arrière-plan…) → la copie ne doit jamais rester affichée.
    setTimeout(end, CUBE_MS + 300);
  }
}
