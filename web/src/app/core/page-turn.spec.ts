import { describe, expect, it } from 'vitest';
import { cubeFace } from './page-turn';

describe('cube qui roule', () => {
  it('fait tourner chaque face autour du centre du cube (demi-largeur en profondeur)', () => {
    expect(cubeFace(390, 0)).toBe('perspective(975px) translateZ(-195px) rotateY(0deg) translateZ(195px)');
    expect(cubeFace(390, -90)).toBe('perspective(975px) translateZ(-195px) rotateY(-90deg) translateZ(195px)');
  });
});
