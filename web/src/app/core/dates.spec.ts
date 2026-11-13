import { describe, expect, it } from 'vitest';
import { dayLabel, isoWeek, listDates, monthRange, parseKey, rangeKeys } from './dates';

describe('dates', () => {
  it('donne le numéro de semaine ISO', () => {
    expect(isoWeek(parseKey('2026-11-13'))).toBe(46);
    expect(isoWeek(parseKey('2027-01-01'))).toBe(53);
  });

  it('écrit les jours en français', () => {
    expect(dayLabel('2026-11-13')).toBe('Vendredi 13 novembre');
  });

  it('résume une sélection de jours', () => {
    expect(listDates(['2026-11-05', '2026-11-03', '2026-11-04'])).toBe('3, 4 et 5 nov.');
    expect(listDates(['2026-11-30', '2026-12-01'])).toBe('30 nov. · 1 déc.');
    expect(listDates(rangeKeys('2026-11-01', '2026-11-10'))).toBe('du 1 au 10 nov. (10 jours)');
  });

  it('borne un mois', () => {
    expect(monthRange(parseKey('2026-02-10'))).toEqual(['2026-02-01', '2026-02-28']);
  });
});
