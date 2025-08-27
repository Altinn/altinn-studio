import {
  getTextResourcesForLanguage,
  createTextResourceWithLanguage,
  convertTextResourceToMutationArgs,
} from './utils';
import type { TextResources, TextResourceWithLanguage } from '@studio/content-library';
import type { TextResource } from '@studio/components-legacy';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';

// Test data:
const language = 'nb';
const textResource: TextResource = {
  id: 'some-id',
  value: 'some-value',
};

describe('utils functions', () => {
  describe('getTextResourcesForLanguage', () => {
    it('should return undefined if text resources input variable is undefined', () => {
      const emptyLanguage = '';
      const undefinedTextResources = undefined;
      expect(getTextResourcesForLanguage(emptyLanguage, undefinedTextResources)).toBeUndefined();
    });

    it('should return array of text resources with correct input', () => {
      const textResources: TextResources = {
        [language]: [textResource],
      };
      const expectedResult = [textResource];

      expect(getTextResourcesForLanguage(language, textResources)).toEqual(expectedResult);
    });
  });

  describe('createTextResourceWithLanguage', () => {
    it('should return text resource with language with correct input', () => {
      const expectedResult: TextResourceWithLanguage = {
        language: language,
        textResource: textResource,
      };

      expect(createTextResourceWithLanguage(language, textResource)).toEqual(expectedResult);
    });
  });

  describe('convertTextResourceToMutationArgs', () => {
    it('should return text resources with correct input', () => {
      const textResourceWithLanguage: TextResourceWithLanguage = {
        language: language,
        textResource: textResource,
      };
      const expectedResult: UpsertTextResourceMutation = {
        textId: textResource.id,
        language,
        translation: textResource.value,
      };

      expect(convertTextResourceToMutationArgs(textResourceWithLanguage)).toEqual(expectedResult);
    });
  });
});
