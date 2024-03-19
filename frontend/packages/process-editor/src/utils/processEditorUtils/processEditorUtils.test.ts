import { supportsProcessEditor } from './processEditorUtils';

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
});
