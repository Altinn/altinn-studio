import {
  label1ResourceNb,
  textResources,
  textResourcesNb,
} from '../../../../../../test-data/textResources';
import { createTextResourceWithLanguage, getTextResourcesForLanguage } from './utils';
import type { TextResourceWithLanguage } from '../../../../../../types/TextResourceWithLanguage';

describe('utils', () => {
  describe('getTextResourcesForLanguage', () => {
    it('Returns the list of text resources for the given language', () => {
      expect(getTextResourcesForLanguage('nb', textResources)).toEqual(textResourcesNb);
    });

    it('Returns undefined when the language does not exist', () => {
      expect(getTextResourcesForLanguage('eo', textResources)).toBeUndefined();
    });

    it('Returns undefined when the textResources parameter is undefined', () => {
      expect(getTextResourcesForLanguage('nb', undefined)).toBeUndefined();
    });
  });

  describe('createTextResourceWithLanguage', () => {
    it('Creates a TextResourceWithLanguage object from the parameters', () => {
      const language = 'nb';
      const textResource = label1ResourceNb;
      const expectedResult: TextResourceWithLanguage = { language, textResource };
      expect(createTextResourceWithLanguage(language, textResource)).toEqual(expectedResult);
    });
  });
});
