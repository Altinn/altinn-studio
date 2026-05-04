import { supportsProcessEditor, isVersionEqualOrGreater } from './processEditorUtils';

describe('processEditorUtils', () => {
  describe('supportsProcessEditor', () => {
    it('returns true if version is newer than 8', () => {
      const result = supportsProcessEditor('8.1.2');
      expect(result).toBeTruthy();
    });

    it('returns false if version is older than 8', () => {
      const result = supportsProcessEditor('7.1.2');
      expect(result).toBeFalsy();
    });
  });

  describe('isVersionEqualOrGreater', () => {
    it('returns true when version equals minVersion', () => {
      expect(isVersionEqualOrGreater('8.9.0', '8.9.0')).toBe(true);
    });

    it('returns true when version is greater (patch)', () => {
      expect(isVersionEqualOrGreater('8.9.1', '8.9.0')).toBe(true);
    });

    it('returns true when version is greater (minor)', () => {
      expect(isVersionEqualOrGreater('8.10.0', '8.9.0')).toBe(true);
    });

    it('returns true when version is greater (major)', () => {
      expect(isVersionEqualOrGreater('9.0.0', '8.9.0')).toBe(true);
    });

    it('returns false when version is lower (patch)', () => {
      expect(isVersionEqualOrGreater('8.8.9', '8.9.0')).toBe(false);
    });

    it('returns false when version is lower (minor)', () => {
      expect(isVersionEqualOrGreater('8.8.0', '8.9.0')).toBe(false);
    });

    it('returns false when version is lower (major)', () => {
      expect(isVersionEqualOrGreater('7.9.0', '8.9.0')).toBe(false);
    });

    it('handles preview versions correctly', () => {
      expect(isVersionEqualOrGreater('8.9.0-preview.1', '8.9.0')).toBe(true);
      expect(isVersionEqualOrGreater('8.10.0-preview.1', '8.9.0')).toBe(true);
      expect(isVersionEqualOrGreater('8.8.0-preview.1', '8.9.0')).toBe(false);
    });

    it('returns false for null or undefined versions', () => {
      expect(isVersionEqualOrGreater(null, '8.9.0')).toBe(false);
      expect(isVersionEqualOrGreater(undefined, '8.9.0')).toBe(false);
      expect(isVersionEqualOrGreater('8.9.0', null)).toBe(false);
      expect(isVersionEqualOrGreater('8.9.0', undefined)).toBe(false);
    });

    it('returns false for empty string versions', () => {
      expect(isVersionEqualOrGreater('', '8.9.0')).toBe(false);
      expect(isVersionEqualOrGreater('8.9.0', '')).toBe(false);
    });

    it('handles versions with different segment counts', () => {
      // Missing segment in version is treated as "latest" (passes)
      expect(isVersionEqualOrGreater('8.9', '8.9.0')).toBe(true);
      // Missing segment in minVersion is treated as "unspecified" (passes)
      expect(isVersionEqualOrGreater('8.9.0', '8.9')).toBe(true);
      // Extra segment in version, minVersion unspecified (passes)
      expect(isVersionEqualOrGreater('8.9.0.1', '8.9.0')).toBe(true);
      // Version with fewer segments but higher minor (passes)
      expect(isVersionEqualOrGreater('8.10', '8.9.0')).toBe(true);
      // Version with fewer segments but lower minor (fails)
      expect(isVersionEqualOrGreater('8.8', '8.9.0')).toBe(false);
    });
  });
});
