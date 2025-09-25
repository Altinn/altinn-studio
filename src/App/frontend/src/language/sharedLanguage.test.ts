import { parseAndCleanText } from 'src/language/sharedLanguage';

describe('sharedLanguage.ts', () => {
  describe('getParsedLanguageFromText', () => {
    it('should return single element if only text is parsed', () => {
      const result = parseAndCleanText('just som plain text');
      expect(result instanceof Array).toBeFalsy();
    });

    it('should return array of nodes for more complex markdown', () => {
      const result = parseAndCleanText('# Header \n With some text');
      expect(result instanceof Array).toBeTruthy();
    });
  });
});
