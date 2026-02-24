import { PublishedElements } from './PublishedElements';

// Test data:
const elementName1 = 'cars';
const elementName2 = 'boats';
const elementName3 = 'planes';
const capitalisedElementName = 'Trains';
const fileNames: string[] = [
  '_index.json',
  `${elementName1}/1.json`,
  `${elementName1}/_index.json`,
  `${elementName1}/_latest.json`,
  `${elementName2}/1.json`,
  `${elementName2}/2.json`,
  `${elementName2}/_index.json`,
  `${elementName2}/_latest.json`,
  `${elementName3}/1.JSON`,
  `${elementName3}/2.JSON`,
  `${elementName3}/3.JSON`,
  `${elementName3}/_index.JSON`,
  `${elementName3}/_latest.JSON`,
  `${capitalisedElementName}/1.json`,
  `${capitalisedElementName}/_index.json`,
  `${capitalisedElementName}/_latest.json`,
];

describe('PublishedElements', () => {
  describe('isPublished', () => {
    it('Returns true when an element with the given name exists in the list', () => {
      const publishedElements = new PublishedElements(fileNames);
      expect(publishedElements.isPublished(elementName1)).toBe(true);
      expect(publishedElements.isPublished(elementName2)).toBe(true);
      expect(publishedElements.isPublished(elementName3)).toBe(true);
      expect(publishedElements.isPublished(capitalisedElementName)).toBe(true);
    });

    it('Returns false when an element with the given name does not exist in the list', () => {
      const publishedElements = new PublishedElements(fileNames);
      expect(publishedElements.isPublished('trains')).toBe(false);
      expect(publishedElements.isPublished('bikes')).toBe(false);
    });
  });

  describe('latestVersionOrNull', () => {
    it('Returns the latest version number of the element with the given name if it exists', () => {
      const publishedElements = new PublishedElements(fileNames);
      expect(publishedElements.latestVersionOrNull(elementName1)).toBe(1);
      expect(publishedElements.latestVersionOrNull(elementName2)).toBe(2);
      expect(publishedElements.latestVersionOrNull(elementName3)).toBe(3);
      expect(publishedElements.latestVersionOrNull(capitalisedElementName)).toBe(1);
    });

    it('Returns null when an element with the given name does not exist in the list', () => {
      const publishedElements = new PublishedElements(fileNames);
      expect(publishedElements.latestVersionOrNull('trains')).toBeNull();
    });
  });
});
