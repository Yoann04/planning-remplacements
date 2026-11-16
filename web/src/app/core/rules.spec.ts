import { describe, expect, it } from 'vitest';
import { Cabinet, Note, WorkDay } from './models';
import { addChoices, autoCode, cabinetNotes, dayTotals, futureDays, legendCabinets, entryClash, freeColor, jours, overlaps, restClash, slotValue } from './rules';

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
    expect(freeColor([{ id: '1', name: 'A', code: 'A', color: '#e5484d', active: true }])).toBe('#F76B15');
  });
});

describe('pense-bêtes d\'un cabinet', () => {
  const note = (id: string, scope: Note['scope'], target: Partial<Note>): Note => ({ id, scope, date: null, cabinetId: null, nurseId: null, text: id, ...target });
  const p = {
    nurses: [{ id: 'n1', cabinetId: 'c1', name: 'Hélène' }, { id: 'n2', cabinetId: 'c1', name: 'Anne' }, { id: 'n3', cabinetId: 'c2', name: 'Paul' }],
    notes: [
      note('infirmière Anne', 'nurse', { nurseId: 'n2' }),
      note('autre cabinet', 'cabinet', { cabinetId: 'c2' }),
      note('jour', 'day', { date: '2026-11-20' }),
      note('cabinet 1', 'cabinet', { cabinetId: 'c1' }),
      note('infirmière Hélène', 'nurse', { nurseId: 'n1' }),
      note('infirmière Paul', 'nurse', { nurseId: 'n3' }),
      note('cabinet 2', 'cabinet', { cabinetId: 'c1' }),
    ],
  };

  it('met ceux du cabinet d\'abord, puis ceux de ses infirmières avec leur nom', () => {
    expect(cabinetNotes(p, 'c1').map(n => [n.text, n.nurseName])).toEqual([
      ['cabinet 1', null], ['cabinet 2', null], ['infirmière Hélène', 'Hélène'], ['infirmière Anne', 'Anne'],
    ]);
  });

  it('ignore les pense-bêtes des jours et des autres cabinets', () => {
    expect(cabinetNotes(p, 'c2').map(n => n.text)).toEqual(['autre cabinet', 'infirmière Paul']);
    expect(cabinetNotes(p, 'inconnu')).toEqual([]);
  });
});

describe('cabinets en veille', () => {
  const cab = (id: string, active: boolean): Cabinet => ({ id, name: id, code: id.slice(0, 2).toUpperCase(), color: '#3B82F6', active });
  const cabs = [cab('actif', true), cab('veille', false), cab('autre', true)];

  it("retire les cabinets en veille des choix d'ajout", () => {
    expect(addChoices(cabs).map(c => c.id)).toEqual(['actif', 'autre']);
  });

  it('garde le cabinet en veille du jour que l\'on modifie', () => {
    expect(addChoices(cabs, 'veille').map(c => c.id)).toEqual(['actif', 'veille', 'autre']);
    expect(addChoices(cabs, 'actif').map(c => c.id)).toEqual(['actif', 'autre']);
  });

  it('légende : seulement les cabinets qui ont des jours dans la période visible, actifs ou non', () => {
    const days = [wd('2026-11-10', 'full', 'veille'), wd('2026-12-02', 'full', 'actif')];
    expect(legendCabinets(cabs, days, '2026-11-01', '2026-11-30').map(c => c.id)).toEqual(['veille']);
    expect(legendCabinets(cabs, days, '2026-01-01', '2026-12-31').map(c => c.id)).toEqual(['actif', 'veille']);
    expect(legendCabinets(cabs, days, '2027-01-01', '2027-01-31')).toEqual([]);
  });

  it('compte les jours encore prévus (après aujourd\'hui) dans un cabinet', () => {
    const days = [wd('2026-11-15', 'full', 'veille'), wd('2026-11-16', 'am', 'veille'), wd('2026-12-01', 'full', 'veille'), wd('2026-12-01', 'full', 'actif')];
    expect(futureDays(days, 'veille', '2026-11-15')).toBe(1.5);
    expect(futureDays(days, 'autre', '2026-11-15')).toBe(0);
  });
});
