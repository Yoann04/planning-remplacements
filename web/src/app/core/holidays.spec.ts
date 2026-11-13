import { describe, expect, it } from 'vitest';
import { publicHoliday, publicHolidays, schoolHoliday } from './holidays';
import { SchoolHoliday } from './models';

describe('jours fériés', () => {
  it('calcule les fériés mobiles à partir de Pâques', () => {
    // Pâques 2026 : 5 avril ; 2027 : 28 mars.
    expect(publicHoliday('2026-04-06')).toBe('Lundi de Pâques');
    expect(publicHoliday('2026-05-14')).toBe('Ascension');
    expect(publicHoliday('2026-05-25')).toBe('Lundi de Pentecôte');
    expect(publicHoliday('2027-03-29')).toBe('Lundi de Pâques');
  });

  it('compte 11 jours fériés en métropole', () => {
    expect(Object.keys(publicHolidays(2026))).toHaveLength(11);
    expect(publicHoliday('2026-11-11')).toBe('Armistice 1918');
    expect(publicHoliday('2026-11-12')).toBeNull();
  });
});

describe('vacances scolaires', () => {
  const periods: SchoolHoliday[] = [
    { zone: 'ALL', name: 'Toussaint', start: '2026-10-17', end: '2026-11-01' },
    { zone: 'A', name: 'Hiver', start: '2027-02-13', end: '2027-02-28' },
    { zone: 'C', name: 'Hiver', start: '2027-02-06', end: '2027-02-21' },
  ];

  it('applique les périodes communes et celles de la zone choisie', () => {
    expect(schoolHoliday('2026-11-01', 'A', periods)).toBe('Toussaint');
    expect(schoolHoliday('2026-11-02', 'A', periods)).toBeNull();
    expect(schoolHoliday('2027-02-08', 'A', periods)).toBeNull();
    expect(schoolHoliday('2027-02-08', 'C', periods)).toBe('Hiver');
  });

  it("n'affiche rien sans zone", () => {
    expect(schoolHoliday('2026-10-20', 'none', periods)).toBeNull();
  });
});
