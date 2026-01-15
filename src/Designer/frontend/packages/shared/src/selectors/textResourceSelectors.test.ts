import type { ITextResources } from 'app-shared/types/global';
import { allTextResourceIdsWithTextSelector, getAllLanguages } from './textResourceSelectors';

describe('textResourceSelectors', () => {
  describe('getAllTextResourceIdsWithTextSelector', () => {
    it('Selects all text resource ids with corresponding text in the given language or an empty text if it does not exist in the given language', () => {
      const onlyNbId = 'onlyNbId';
      const onlyNbIdText = 'En tekst som bare finnes på norsk';
      const onlyEnId = 'onlyEnId';
      const onlyEnIdText = 'A text that only exists in English';
      const bothId = 'bothId';
      const bothIdTextNb = 'En tekst som finnes på begge språkene';
      const bothIdTextEn = 'A text that exists in both languages';
      const textResources: ITextResources = {
        nb: [
          {
            id: onlyNbId,
            value: onlyNbIdText,
          },
          {
            id: bothId,
            value: bothIdTextNb,
          },
        ],
        en: [
          {
            id: onlyEnId,
            value: onlyEnIdText,
          },
          {
            id: bothId,
            value: bothIdTextEn,
          },
        ],
      };
      expect(allTextResourceIdsWithTextSelector('nb')(textResources)).toEqual([
        {
          id: onlyNbId,
          value: onlyNbIdText,
        },
        {
          id: bothId,
          value: bothIdTextNb,
        },
        {
          id: onlyEnId,
          value: '',
        },
      ]);
    });
  });

  describe('getAllLanguages', () => {
    it('Returns all languages present in the text resources object', () => {
      const textResources: ITextResources = {
        nb: [{ id: 'someId', value: 'someValue' }],
        en: [{ id: 'someId', value: 'someValue' }],
      };
      expect(getAllLanguages(textResources)).toEqual(['nb', 'en']);
    });
  });
});
