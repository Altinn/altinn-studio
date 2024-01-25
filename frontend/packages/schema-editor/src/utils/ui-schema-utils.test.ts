import { makeDomFriendlyID, isValidName } from './ui-schema-utils';

describe('ui-schema-utils', () => {
  describe('getDomFriendlyID', () => {
    it('removes unsupported characters', () => {
      const idWithUnsupportedCharacters = '#my\\id: with+unsupported/CHARACTERS ^ *0';
      expect(makeDomFriendlyID(idWithUnsupportedCharacters, { suffix: '1/2#3 4#5/' })).toMatch(
        /^my-id-_with-unsupported\/characters_-_-0-1\/23_45\//,
      );
    });
    it('should return a new value each time the command is run until it is reset', () => {
      const usedIds = [makeDomFriendlyID('id', { reset: true })];
      for (let test = 1; test <= 10; test++) {
        const newId = makeDomFriendlyID('id');
        expect(usedIds).not.toContain(newId);
        usedIds.push(newId);
      }
      const resetId = makeDomFriendlyID('id', { reset: true });
      expect(resetId).toBe('id-0');
      expect(usedIds).toContain(resetId);
    });

    it('should validate provided name - valid name should return true', () => {
      const validName = 'test1234_test456';
      expect(isValidName(validName)).toBeTruthy();
    });

    it('should validate provided name - name with special characters should return false', () => {
      const invalidName = 'test123*';
      expect(isValidName(invalidName)).toBeFalsy();
    });

    it('should validate provided name - name with whitespace should return false', () => {
      const invalidName = 'test 123';
      expect(isValidName(invalidName)).toBeFalsy();
    });
  });
});
