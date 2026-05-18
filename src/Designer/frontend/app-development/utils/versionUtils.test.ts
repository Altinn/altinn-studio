import { isVersionAtLeast } from './versionUtils';

describe('versionUtils', () => {
  describe('isVersionAtLeast', () => {
    it.each([
      ['9.0.0', 9, 0, 0, true],
      ['9.0.0-preview.1', 9, 0, 0, true],
      ['10.0.0', 9, 0, 0, true],
      ['9.1.0', 9, 0, 0, true],
      ['9.0.1', 9, 0, 0, true],
      ['8.3.0', 9, 0, 0, false],
      ['9.0.0', 9, 1, 0, false],
      ['9.1.0', 9, 1, 1, false],
      [undefined, 9, 0, 0, false],
      ['9.invalid.0', 9, 0, 0, false],
    ])(
      'returns %s when comparing %s against %s.%s.%s',
      (version, major, minor, patch, expected) => {
        expect(isVersionAtLeast(version, major, minor, patch)).toBe(expected);
      },
    );
  });
});
