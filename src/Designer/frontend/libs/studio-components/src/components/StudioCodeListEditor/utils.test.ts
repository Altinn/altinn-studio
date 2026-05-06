import type { CodeList } from './types/CodeList';
import {
  addLanguage,
  addNewCodeListItem,
  changeCodeListItem,
  initialiseSelectedLanguage,
  extractLanguageCodes,
  isCodeListEmpty,
  removeCodeListItem,
  removeLanguage,
  updateCodeText,
  initialiseLanguageOptions,
} from './utils';
import type { UpdateCodeTextArgs } from './utils';
import { ObjectUtils } from '@studio/pure-functions';
import { codeList } from './test-data/codeList';
import { CodeListItemTextProperty } from './enums/CodeListItemTextProperty';
import type { CodeListItem } from './types/CodeListItem';
import type { MultiLanguageText } from '../../types/MultiLanguageText';

// Test data:
const testCodeList: CodeList = [
  {
    value: 'test1',
    label: {
      en: 'Label 1',
      nb: 'Ledetekst 1',
    },
    description: {
      en: 'Description 1',
      nb: 'Beskrivelse 1',
    },
  },
  {
    value: 'test2',
    label: {
      en: 'Label 2',
      nb: 'Ledetekst 2',
    },
    description: {
      en: 'Description 2',
      nb: 'Beskrivelse 2',
    },
  },
];
const createTestCodeList = (): CodeList => ObjectUtils.deepCopy(testCodeList);

const textProperties: Array<keyof CodeListItem> = ['label', 'description', 'helpText'];

describe('StudioCodelistEditor utils', () => {
  describe('addNewCodeListItem', () => {
    it('Adds an empty string item when the code list consists of strings', () => {
      const updatedCodeList = addNewCodeListItem(codeList);
      expect(updatedCodeList).toEqual([...codeList, { value: '', label: {} }]);
    });

    it('Returns a new instance', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = addNewCodeListItem(codeList);
      expect(updatedCodeList).not.toBe(codeList);
    });
  });

  describe('removeCodeListItem', () => {
    it('Removes the code list item at the given index', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = removeCodeListItem(codeList, 1);
      expect(updatedCodeList).toEqual([codeList[0]]);
    });

    it('Returns a new instance', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = removeCodeListItem(codeList, 1);
      expect(updatedCodeList).not.toBe(codeList);
    });
  });

  describe('changeCodeListItem', () => {
    const updatedItem: CodeListItem = {
      label: {
        en: 'Updated label',
        nb: 'Oppdatert ledetekst',
      },
      value: 'updatedValue',
    };

    it('Replaces the code list item at the given index', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = changeCodeListItem(codeList, 1, updatedItem);
      expect(updatedCodeList).toEqual([codeList[0], updatedItem]);
    });

    it('Returns a new instance', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = changeCodeListItem(codeList, 1, updatedItem);
      expect(updatedCodeList).not.toBe(codeList);
    });
  });

  describe('isCodeListEmpty', () => {
    it('Returns true when the code list is empty', () => {
      expect(isCodeListEmpty([])).toBe(true);
    });

    it('Returns false when the code list is not empty', () => {
      const codeList = createTestCodeList();
      expect(isCodeListEmpty(codeList)).toBe(false);
    });
  });

  describe('updateCodeText', () => {
    const codeItemIndex = 1;
    const newValue = 'new text';
    const language = 'nb';

    it.each(Object.values(CodeListItemTextProperty))(
      'Returns updated codeList when the %s property is updated',
      (property: CodeListItemTextProperty) => {
        const updateArgs: UpdateCodeTextArgs = { property, codeItemIndex, language, newValue };
        const result = updateCodeText(codeList, updateArgs);
        expect(result).toEqual([
          codeList[0],
          { ...codeList[1], [property]: { ...codeList[1][property], [language]: newValue } },
          codeList[2],
        ]);
      },
    );

    it('Adds the property if it does not exist', () => {
      const codeListItemWithoutDescription: CodeListItem = {
        value: 'test',
        label: { en: 'Label', nb: 'Ledetekst' },
      };
      const initialCodeList: CodeList = [codeListItemWithoutDescription];
      const newDescription = 'New description';
      const updateArgs: UpdateCodeTextArgs = {
        property: CodeListItemTextProperty.Description,
        codeItemIndex: 0,
        language: 'nb',
        newValue: newDescription,
      };
      const result = updateCodeText(initialCodeList, updateArgs);
      expect(result).toEqual([
        { ...codeListItemWithoutDescription, description: { nb: newDescription } },
      ]);
    });
  });

  describe('extractLanguageCodes', () => {
    it('Returns a list of all present languages', () => {
      expect(extractLanguageCodes(testCodeList)).toEqual(['en', 'nb']);
    });

    it.each(textProperties)(
      'Returns a list of all languages when only %s is present',
      (property) => {
        const codeList: CodeList = [
          { value: 'test', [property]: { en: 'Label', nb: 'Ledetekst' } },
        ];
        expect(extractLanguageCodes(codeList)).toEqual(['en', 'nb']);
      },
    );

    it('Includes all codes when different languages are present for different properties', () => {
      const codeList: CodeList = [
        {
          value: 'test',
          label: { en: 'Label', nb: 'Ledetekst' },
          description: { nb: 'Beskrivelse', nn: 'Beskrivelse' },
        },
      ];
      expect(extractLanguageCodes(codeList)).toEqual(['en', 'nb', 'nn']);
    });

    it('Includes all codes when different languages are present for different items', () => {
      const codeList: CodeList = [
        { value: 'test1', label: { en: 'Label 1', nb: 'Ledetekst 1' } },
        { value: 'test2', label: { nb: 'Ledetekst 1', nn: 'Ledetekst 1' } },
      ];
      expect(extractLanguageCodes(codeList)).toEqual(['en', 'nb', 'nn']);
    });

    it('Returns an empty list when no languages are present', () => {
      expect(extractLanguageCodes([{ value: 'test' }])).toEqual([]);
    });

    it('Returns an empty list when the code list is empty', () => {
      expect(extractLanguageCodes([])).toEqual([]);
    });
  });

  describe('addLanguage', () => {
    it('Does not mutate the input instance', () => {
      const result = addLanguage(testCodeList, 'nn');
      expect(result).not.toEqual(testCodeList);
    });

    it('Adds a label with an empty string for the new language on all items', () => {
      const result = addLanguage(testCodeList, 'nn');
      expect(result[0].label).toEqual({ ...testCodeList[0].label, nn: '' });
      expect(result[1].label).toEqual({ ...testCodeList[1].label, nn: '' });
    });

    it('Does not override existing texts', () => {
      expect(addLanguage(testCodeList, 'nb')).toEqual(testCodeList);
    });

    it('Adds label property to items if it does not exist', () => {
      const codeListWithoutLabel: CodeList = [{ value: 'test' }];
      const result = addLanguage(codeListWithoutLabel, 'nb');
      expect(result).toEqual([{ value: 'test', label: { nb: '' } }]);
    });
  });

  describe('removeLanguage', () => {
    it('Does not mutate the input instance', () => {
      const result = removeLanguage(testCodeList, 'en');
      expect(result).not.toEqual(testCodeList);
    });

    it.each(textProperties)('Removes the given language from the %s', (property) => {
      const codeList: CodeList = [
        {
          value: 'test',
          label: { en: 'Label', nb: 'Ledetekst' },
          description: { en: 'Description', nb: 'Beskrivelse' },
          helpText: { en: 'Help', nb: 'Hjelp' },
        },
      ];
      const result = removeLanguage(codeList, 'en');
      expect(result[0][property]).toEqual({ nb: (codeList[0][property] as MultiLanguageText).nb! });
    });

    it('Removes the given language from all items', () => {
      const result = removeLanguage(testCodeList, 'en');
      expect(result[0].label).not.toHaveProperty('en');
      expect(result[1].label).not.toHaveProperty('en');
    });

    it('Does not change anything when the given language does not exist', () => {
      const result = removeLanguage(testCodeList, 'fr');
      expect(result).toEqual(testCodeList);
    });

    it('Does not add new properties', () => {
      const codeList: CodeList = [
        {
          value: 'test',
          label: { nb: 'Test', en: 'Test' },
        },
      ];
      const result = removeLanguage(codeList, 'en');
      expect(result[0]).not.toHaveProperty('description');
      expect(result[0]).not.toHaveProperty('helpText');
    });
  });

  describe('initialiseSelectedLanguage', () => {
    it('Returns the first language code that appears in the code list', () => {
      expect(initialiseSelectedLanguage(testCodeList, 'nb')).toBe('en');
    });

    it('Returns the fallback language code when no texts are defined within the code list', () => {
      const codeList: CodeList = [
        { value: 'test1', label: {} },
        { value: 'test2', label: {} },
      ];
      const fallbackCode = 'nb';
      expect(initialiseSelectedLanguage(codeList, fallbackCode)).toBe(fallbackCode);
    });

    it('Returns the fallback language code when the code list is empty', () => {
      const fallbackCode = 'nb';
      expect(initialiseSelectedLanguage([], fallbackCode)).toBe(fallbackCode);
    });
  });

  describe('initialiseLanguageOptions', () => {
    it('Returns the languages from the code list in order of appearance', () => {
      expect(initialiseLanguageOptions(testCodeList, 'nb')).toEqual(['en', 'nb']);
    });

    it('Returns a list with the fallback language code only when no texts are defined within the code list', () => {
      const codeList: CodeList = [
        { value: 'test1', label: {} },
        { value: 'test2', label: {} },
      ];
      const fallbackCode = 'nb';
      expect(initialiseLanguageOptions(codeList, fallbackCode)).toEqual([fallbackCode]);
    });

    it('Returns a list with the fallback language code only when the code list is empty', () => {
      const fallbackCode = 'nb';
      expect(initialiseLanguageOptions([], fallbackCode)).toEqual([fallbackCode]);
    });
  });
});
