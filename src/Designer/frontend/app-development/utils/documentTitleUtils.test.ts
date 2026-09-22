import { buildDocumentTitle } from './documentTitleUtils';

describe('documentTitleUtils', () => {
  describe('buildDocumentTitle', () => {
    it.each([
      ['my-app', 'my-app – Altinn Studio'],
      ['', 'Altinn Studio'],
      [undefined, 'Altinn Studio'],
    ])('returns "%s" as "%s"', (title, expected) => {
      expect(buildDocumentTitle(title)).toBe(expected);
    });
  });
});
