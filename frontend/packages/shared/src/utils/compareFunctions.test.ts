import {
  alphabeticalCompareFunction,
  isBelowSupportedVersion,
} from 'app-shared/utils/compareFunctions';

describe('compareFunctions', () => {
  test('alphabeticalCompareFunction', () => {
    expect(alphabeticalCompareFunction('abc', 'bcd')).toBeLessThan(0);
    expect(alphabeticalCompareFunction('bcd', 'abc')).toBeGreaterThan(0);
    expect(alphabeticalCompareFunction('abc', 'abc')).toEqual(0);
  });

  describe('isBelowSupportedVersion', () => {
    test('returns true if version is invalid', () => {
      expect(isBelowSupportedVersion(null, 4)).toBeTruthy();
      expect(isBelowSupportedVersion('4', undefined)).toBeTruthy();
    });

    test('returns true if current version is less than the supported version', () => {
      expect(isBelowSupportedVersion('1.0.1', 2)).toBeTruthy();
      expect(isBelowSupportedVersion('2.1', 3)).toBeTruthy();
      expect(isBelowSupportedVersion('3', 4)).toBeTruthy();
    });
  });
});
