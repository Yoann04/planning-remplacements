/**
 * Balayage horizontal dans le calendrier : vers la gauche = période suivante, vers la droite = période précédente.
 * Fonction pure, testée à part ; l'écran principal (app.ts) ne fait que lui passer les positions du doigt.
 */
export const SWIPE = {
  /** Distance horizontale minimale (px). */
  min: 60,
  /** Le geste doit être nettement horizontal : |dx| > ratio × |dy|. */
  ratio: 1.5,
  /** Bande sur les bords où le geste « retour » d'iOS a la priorité (px). */
  edge: 20,
} as const;

export interface SwipeContext {
  /** Onglet affiché : le balayage ne sert que dans le calendrier (pas dans « Mon activité »). */
  tab: 'cal' | 'act';
  /** Une fenêtre (sheet) est ouverte. */
  sheetOpen: boolean;
  /** Mode « Ajouter des jours » : le glisser du doigt y sert à sélectionner des jours. */
  adding: boolean;
}

export interface Point { x: number; y: number }

/** -1 = période précédente, 1 = période suivante, 0 = geste ignoré. */
export function swipeStep(start: Point, end: Point, screenWidth: number, ctx: SwipeContext): -1 | 0 | 1 {
  if (ctx.tab !== 'cal' || ctx.sheetOpen || ctx.adding) return 0;
  if (start.x < SWIPE.edge || start.x > screenWidth - SWIPE.edge) return 0;
  const dx = end.x - start.x, dy = end.y - start.y;
  if (Math.abs(dx) < SWIPE.min || Math.abs(dx) <= SWIPE.ratio * Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}
