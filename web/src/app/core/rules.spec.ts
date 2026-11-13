import { describe, expect, it } from 'vitest';
import { WorkDay } from './models';
import { autoCode, dayTotals, entryClash, freeColor, jours, overlaps, restClash, slotValue } from './rules';

const wd = (date: string, slot: WorkDay['slot'], cabinetId = 'c1'): WorkDay => ({ id: date + slot + cabinetId, date, cabinetId, nurseId: null, slot });

describe('règles du planning', () => {
  it('compte 1 pour une journée et 0,5 pour une demi-journée', () => {
    expect(slotValue('full')).toBe(1);
    expect(slotValue('am')).toBe(0.5);
    expect(slotValue('pm')).toBe(0.5);
  });

  it('fait se chevaucher la journée avec tout, et une demi-journée avec elle-même', () => {
    expect(overlaps('full', 'am')).toBe(true);
    expect(overlaps('pm', 'full')).toBe(true);
    expect(overlaps('am', 'am')).toBe(true);
    expect(overlaps('am', 'pm')).toBe(false);
  });

  it('refuse un repos sur une période déjà occupée par un cabinet', () => {
    expect(restClash([wd('2026-11-27', 'pm')], 'full')).toBe(true);
    expect(restClash([wd('2026-11-27', 'pm')], 'pm')).toBe(true);
    expect(restClash([wd('2026-11-27', 'pm')], 'am')).toBe(false);
    expect(restClash([], 'full')).toBe(false);
  });

  it('retire le repos quand un cabinet le chevauche', () => {
    expect(entryClash('full', 'am')).toBe(true);
    expect(entryClash('am', 'am')).toBe(true);
    expect(entryClash('am', 'pm')).toBe(false);
    expect(entryClash(null, 'full')).toBe(false);
  });

  it('calcule jours au total, faits (aujourd\'hui inclus) et prévus', () => {
    const days = [wd('2026-11-02', 'full'), wd('2026-11-15', 'full'), wd('2026-11-26', 'am'), wd('2026-11-26', 'pm', 'c2'), wd('2026-12-01', 'full')];
    expect(dayTotals(days, '2026-11-01', '2026-11-30', '2026-11-15')).toEqual({ total: 3, done: 2, todo: 1 });
  });

  it('écrit les quantités en français', () => {
    expect(jours(0.5)).toBe('0,5 jour');
    expect(jours(1.5)).toBe('1,5 jour');
    expect(jours(2)).toBe('2 jours');
  });

  it('propose des initiales à partir du nom du cabinet', () => {
    expect(autoCode('Cabinet des Lilas')).toBe('LI');
    expect(autoCode('Saint-Roch')).toBe('SR');
    expect(autoCode('Écureuils')).toBe('EC');
    expect(autoCode('Cabinet du')).toBe('');
  });

  it('propose une couleur libre', () => {
    expect(freeColor([])).toBe('#E5484D');
    expect(freeColor([{ id: '1', name: 'A', code: 'A', color: '#e5484d' }])).toBe('#F76B15');
  });
});
