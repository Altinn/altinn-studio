import { describe, expect, it } from 'vitest';
import { isValidFieldName, suggestFieldName } from './fieldNameUtils';

const fallback = 'input';

describe('suggestFieldName', () => {
  it.each([
    ['Fornavn', 'fornavn'],
    ['Første ønske', 'forsteOnske'],
    ['Bærum kommune', 'baerumKommune'],
    ['Årsinntekt (NOK)', 'aarsinntektNok'],
    ['1. Navn på søker', 'navnPaaSoker'],
    ['  E-post  ', 'ePost'],
    ['Crème brûlée', 'cremeBrulee'],
  ])('turns "%s" into "%s"', (label, expected) => {
    expect(suggestFieldName(label, [], fallback)).toBe(expected);
  });

  it('adds a number when the name is taken', () => {
    expect(suggestFieldName('Fornavn', ['fornavn', 'fornavn2'], fallback)).toBe('fornavn3');
  });

  it('adds a number when the name is a reserved word', () => {
    expect(suggestFieldName('Class', [], fallback)).toBe('class2');
  });

  it('falls back to the given name when the label has no usable characters', () => {
    expect(suggestFieldName('???', [], fallback)).toBe(fallback);
  });

  it('shortens long names at a word boundary', () => {
    const name = suggestFieldName(
      'Hvor mange dager har du vært borte fra arbeidet det siste året',
      [],
      fallback,
    );
    expect(name.length).toBeLessThanOrEqual(40);
    expect(name).toBe('hvorMangeDagerHarDuVaertBorteFraArbeidet');
  });
});

describe('isValidFieldName', () => {
  it.each(['fornavn', 'forsteOnske', 'adresse_2'])('accepts "%s"', (name) => {
    expect(isValidFieldName(name)).toBe(true);
  });

  it.each(['', '2adresse', 'første', 'e-post', 'class', 'String'])('rejects "%s"', (name) => {
    expect(isValidFieldName(name)).toBe(false);
  });
});
