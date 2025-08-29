import { mapKeywordsArrayToString, mapStringToKeywords } from './appConfigKeywordUtils';
import type { Keyword } from 'app-shared/types/AppConfig';

describe('appConfigKeywordUtils', () => {
  describe('mapKeywordsArrayToString', () => {
    it('returns a comma-separated string of keyword values', () => {
      const word1: string = 'test1';
      const word2: string = 'test2';
      const keywords: Keyword[] = [
        { language: 'nb', word: word1 },
        { language: 'nb', word: word2 },
      ];
      expect(mapKeywordsArrayToString(keywords)).toBe(`${word1}, ${word2}`);
    });

    it('handles extra spaces in words correctly', () => {
      const word1: string = '  test1';
      const word2: string = 'test2  ';
      const keywords: Keyword[] = [
        { language: 'nb', word: word1 },
        { language: 'nb', word: word2 },
      ];
      expect(mapKeywordsArrayToString(keywords)).toBe(`${word1}, ${word2}`);
    });
  });

  describe('mapStringToKeywords', () => {
    it('returns an empty array for an empty string', () => {
      expect(mapStringToKeywords('')).toEqual([]);
    });

    it('splits a comma-separated string into keyword objects', () => {
      const word1: string = 'test1';
      const word2: string = 'test2';
      const word3: string = 'test3';
      const input: string = `${word1},${word2},${word3}`;

      const expected: Keyword[] = [
        { language: 'nb', word: word1 },
        { language: 'nb', word: word2 },
        { language: 'nb', word: word3 },
      ];
      expect(mapStringToKeywords(input)).toEqual(expected);
    });

    it('trims whitespace around keywords', () => {
      const word1: string = '  test1';
      const word2: string = '  test2  ';
      const word3: string = 'test3';
      const input: string = `${word1},${word2},${word3}`;

      const expected: Keyword[] = [
        { language: 'nb', word: word1.trim() },
        { language: 'nb', word: word2.trim() },
        { language: 'nb', word: word3.trim() },
      ];
      expect(mapStringToKeywords(input)).toEqual(expected);
    });
  });
});
