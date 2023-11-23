import { getIfVersionIs8OrNewer } from './processEditorUtils';

describe('processEditorUtils', () => {
  describe('getIfVersionIs8OrNewer', () => {
    it('returns true if version is newer than 8', () => {
      const result = getIfVersionIs8OrNewer('8.1.2');
      expect(result).toBeTruthy();
    });

    it('returns false if version is older than 8', () => {
      const result = getIfVersionIs8OrNewer('7.1.2');
      expect(result).toBeFalsy();
    });
  });
});
