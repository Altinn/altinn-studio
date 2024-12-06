import {
  extractLanguagesFromWidgetTexts,
  extractTextsFromWidgetTextsByLanguage,
} from './widgetUtils';
import type { IWidgetTexts } from '../types/global';

describe('widgetUtils', () => {
  describe('extractLanguagesFromWidgetTexts', () => {
    it('Returns an empty array if no texts are provided', () => {
      expect(extractLanguagesFromWidgetTexts([])).toEqual([]);
    });

    it('Returns an array with the language of the text if only one text is provided', () => {
      const language = 'nb';
      expect(extractLanguagesFromWidgetTexts([{ language, resources: [] }])).toEqual([language]);
    });

    it('Returns an array with the languages of the texts if multiple languages are provided', () => {
      const language1 = 'nb';
      const language2 = 'en';
      expect(
        extractLanguagesFromWidgetTexts([
          { language: language1, resources: [] },
          { language: language2, resources: [] },
        ]),
      ).toEqual([language1, language2]);
    });

    it('Pushes each language only once', () => {
      const language1 = 'nb';
      const language2 = 'en';
      expect(
        extractLanguagesFromWidgetTexts([
          { language: language1, resources: [] },
          { language: language2, resources: [] },
          { language: language1, resources: [] },
        ]),
      ).toEqual([language1, language2]);
    });
  });

  describe('extractTextsFromWidgetTextsByLanguage', () => {
    it('Returns an empty array if no texts with the given language exist', () => {
      const language = 'nb';
      expect(
        extractTextsFromWidgetTextsByLanguage([{ language: 'en', resources: [] }], language),
      ).toEqual([]);
    });

    it('Returns an array with the text resources of the text with the given language', () => {
      const language = 'nb';
      const otherLanguage = 'en';
      const textResources = [
        { id: '1', value: 'value1' },
        { id: '2', value: 'value2' },
      ];
      const otherTextResources = [
        { id: '3', value: 'value3' },
        { id: '4', value: 'value4' },
      ];
      const additionalTextResources = [
        { id: '5', value: 'value5' },
        { id: '6', value: 'value6' },
      ];
      const widgetTexts: IWidgetTexts[] = [
        { language, resources: textResources },
        { language: otherLanguage, resources: otherTextResources },
        { language, resources: additionalTextResources },
      ];
      expect(extractTextsFromWidgetTextsByLanguage(widgetTexts, language)).toEqual(
        textResources.concat(additionalTextResources),
      );
      expect(extractTextsFromWidgetTextsByLanguage(widgetTexts, otherLanguage)).toEqual(
        otherTextResources,
      );
    });
  });
});
