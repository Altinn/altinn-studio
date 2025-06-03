import { setTextResourcesForLanguage } from 'app-shared/utils/textResourceUtils';
import type { ITextResource, ITextResources } from 'app-shared/types/global';

// Test data:
const textResourceId1 = 'id1';
const textResourceId2 = 'id2';

describe('textResourceUtils', () => {
  describe('setTextResourcesForLanguage', () => {
    const language1 = 'nb';
    const language2 = 'en';
    const value1Lang1 = 'verdi1';
    const value2Lang1 = 'verdi2';
    const value1Lang2 = 'value1';
    const value2Lang2 = 'value2';
    const existingTextResources: ITextResources = {
      [language1]: [
        { id: textResourceId1, value: value1Lang1 },
        { id: textResourceId2, value: value2Lang1 },
      ],
      [language2]: [
        { id: textResourceId1, value: value1Lang2 },
        { id: textResourceId2, value: value2Lang2 },
      ],
    };

    it('Modifies given resources in the given language', () => {
      const newValue2Lang1 = 'nyverdi2';
      const newId3 = 'id3';
      const newValue3Lang1 = 'nyverdi3';
      const newValues: ITextResource[] = [
        { id: textResourceId2, value: newValue2Lang1 }, // Modify existing
        { id: newId3, value: newValue3Lang1 }, // Add a new
      ];
      expect(setTextResourcesForLanguage(existingTextResources, language1, newValues)).toEqual({
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
      expect(setTextResourcesForLanguage(existingTextResources, newLanguage, newResources)).toEqual(
        {
          [language1]: [
            { id: textResourceId1, value: value1Lang1 },
            { id: textResourceId2, value: value2Lang1 },
          ],
          [language2]: [
            { id: textResourceId1, value: value1Lang2 },
            { id: textResourceId2, value: value2Lang2 },
          ],
          [newLanguage]: newResources,
        },
      );
    });

    it('Adds a non existing text to the start of the list', () => {
      const newId = 'new-id';
      const newValue = '';
      const newResources: ITextResource[] = [{ id: newId, value: newValue }];
      expect(setTextResourcesForLanguage(existingTextResources, language1, newResources)).toEqual({
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
});
