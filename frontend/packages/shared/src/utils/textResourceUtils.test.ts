import {
  setTextResourcesForLanguage,
  updateEntireLanguage,
} from 'app-shared/utils/textResourceUtils';
import type {
  ITextResource,
  ITextResources,
  ITextResourcesWithLanguage,
} from 'app-shared/types/global';

// Test data:
const language1 = 'nb';
const language2 = 'en';
const textResourceId1 = 'id1';
const textResourceId2 = 'id2';
const value1Lang1 = 'verdi1';
const value2Lang1 = 'verdi2';
const value1Lang2 = 'value1';
const value2Lang2 = 'value2';
const textResources: ITextResources = {
  [language1]: [
    { id: textResourceId1, value: value1Lang1 },
    { id: textResourceId2, value: value2Lang1 },
  ],
  [language2]: [
    { id: textResourceId1, value: value1Lang2 },
    { id: textResourceId2, value: value2Lang2 },
  ],
};

describe('textResourceUtils', () => {
  describe('setTextResourcesForLanguage', () => {
    it('Modifies given resources in the given language', () => {
      const newValue2Lang1 = 'nyverdi2';
      const newId3 = 'id3';
      const newValue3Lang1 = 'nyverdi3';
      const newValues: ITextResource[] = [
        { id: textResourceId2, value: newValue2Lang1 }, // Modify existing
        { id: newId3, value: newValue3Lang1 }, // Add a new
      ];
      expect(setTextResourcesForLanguage(textResources, language1, newValues)).toEqual({
        [language1]: [
          { id: newId3, value: newValue3Lang1 },
          { id: textResourceId1, value: value1Lang1 },
          { id: textResourceId2, value: newValue2Lang1 },
        ],
        [language2]: [
          { id: textResourceId1, value: value1Lang2 },
          { id: textResourceId2, value: value2Lang2 },
        ],
      });
    });

    it('Adds new language if it does not exist', () => {
      const newLanguage = 'fr';
      const value1NewLang = 'valeur1';
      const value2NewLang = 'valeur2';
      const newResources: ITextResource[] = [
        { id: textResourceId1, value: value1NewLang },
        { id: textResourceId2, value: value2NewLang },
      ];
      expect(setTextResourcesForLanguage(textResources, newLanguage, newResources)).toEqual({
        [language1]: [
          { id: textResourceId1, value: value1Lang1 },
          { id: textResourceId2, value: value2Lang1 },
        ],
        [language2]: [
          { id: textResourceId1, value: value1Lang2 },
          { id: textResourceId2, value: value2Lang2 },
        ],
        [newLanguage]: newResources,
      });
    });

    it('Adds a non existing text to the start of the list', () => {
      const newId = 'new-id';
      const newValue = '';
      const newResources: ITextResource[] = [{ id: newId, value: newValue }];
      expect(setTextResourcesForLanguage(textResources, language1, newResources)).toEqual({
        [language1]: [
          { id: newId, value: newValue },
          { id: textResourceId1, value: value1Lang1 },
          { id: textResourceId2, value: value2Lang1 },
        ],
        [language2]: [
          { id: textResourceId1, value: value1Lang2 },
          { id: textResourceId2, value: value2Lang2 },
        ],
      });
    });
  });

  describe('updateEntireLanguage', () => {
    it('Replaces the entire language resources', () => {
      const newList: ITextResource[] = [
        { id: 'a', value: 'newValue1' },
        { id: 'b', value: 'newValue2' },
      ];
      const inputData: ITextResourcesWithLanguage = {
        language: language1,
        resources: newList,
      };
      const result = updateEntireLanguage(textResources, inputData);
      expect(result).toEqual({
        [language1]: newList,
        [language2]: textResources[language2],
      });
    });

    it('Adds new language if it does not exist', () => {
      const newLanguage = 'fr';
      const newList: ITextResource[] = [
        { id: 'a', value: 'valeur1' },
        { id: 'b', value: 'valeur2' },
      ];
      const inputData: ITextResourcesWithLanguage = {
        language: newLanguage,
        resources: newList,
      };
      const result = updateEntireLanguage(textResources, inputData);
      expect(result).toEqual({
        [language1]: textResources[language1],
        [language2]: textResources[language2],
        [newLanguage]: newList,
      });
    });
  });
});
