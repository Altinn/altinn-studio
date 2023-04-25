import { alphabeticalCompareFunction } from 'app-shared/utils/compareFunctions';

describe('compareFunctions', () => {
  test('alphabeticalCompareFunction', () => {
    expect(alphabeticalCompareFunction('abc', 'bcd')).toBeLessThan(0);
    expect(alphabeticalCompareFunction('bcd', 'abc')).toBeGreaterThan(0);
    expect(alphabeticalCompareFunction('abc', 'abc')).toEqual(0);
  });
})
