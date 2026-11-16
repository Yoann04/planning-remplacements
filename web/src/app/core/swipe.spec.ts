import { describe, expect, it } from 'vitest';
import { SwipeContext, swipeStep } from './swipe';

const W = 390;
const cal: SwipeContext = { tab: 'cal', sheetOpen: false, adding: false };
const go = (x0: number, y0: number, x1: number, y1: number, ctx = cal) => swipeStep({ x: x0, y: y0 }, { x: x1, y: y1 }, W, ctx);

describe('balayage pour changer de période', () => {
  it('vers la gauche : période suivante ; vers la droite : période précédente', () => {
    expect(go(300, 400, 150, 410)).toBe(1);
    expect(go(100, 400, 250, 390)).toBe(-1);
  });

  it('ignore un geste trop court (60 px minimum)', () => {
    expect(go(200, 400, 145, 400)).toBe(0);
    expect(go(200, 400, 140, 400)).toBe(1);
  });

  it('ne gêne pas le défilement vertical (horizontal > 1,5 × vertical)', () => {
    expect(go(300, 400, 200, 500)).toBe(0); // diagonale
    expect(go(300, 400, 200, 333)).toBe(0); // 100 px contre 67 px : pas assez net (1,5 × 67 = 100,5)
    expect(go(300, 400, 200, 334)).toBe(1); // 100 px contre 66 px (1,5 × 66 = 99)
    expect(go(200, 600, 210, 200)).toBe(0); // défilement vertical
  });

  it("laisse le bord de l'écran au geste « retour » d'iOS", () => {
    expect(go(10, 400, 200, 400)).toBe(0);
    expect(go(W - 10, 400, 150, 400)).toBe(0);
    expect(go(20, 400, 200, 400)).toBe(-1);
  });

  it('ignore le geste dans le mode ajout, avec une fenêtre ouverte ou dans « Mon activité »', () => {
    expect(go(300, 400, 100, 400, { ...cal, adding: true })).toBe(0);
    expect(go(300, 400, 100, 400, { ...cal, sheetOpen: true })).toBe(0);
    expect(go(300, 400, 100, 400, { ...cal, tab: 'act' })).toBe(0);
  });
});
