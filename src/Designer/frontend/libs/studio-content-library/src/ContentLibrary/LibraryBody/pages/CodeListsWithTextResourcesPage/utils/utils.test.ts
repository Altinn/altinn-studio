import type { CodeListIdSource, CodeListReference } from '../types/CodeListReference';
import {
  createTextResourceWithLanguage,
  filterCodeLists,
  getCodeListSourcesById,
  getCodeListUsageCount,
  getUsageTaskTypeTextKey,
  getTextResourcesForLanguage,
} from './';
import type { CodeListData } from '../CodeListsWithTextResourcesPage';
import {
  label1ResourceNb,
  textResources,
  textResourcesNb,
} from '../../../../../test-data/textResources';
import type { TextResourceWithLanguage } from '../../../../../types/TextResourceWithLanguage';
import { CodeListUsageTaskType } from '../../../../../types/CodeListUsageTaskType';

const codeListId1: string = 'codeListId1';
const codeListId2: string = 'codeListId2';
const componentIds: string[] = ['componentId1', 'componentId2'];
const codeListIdSource: CodeListIdSource = {
  taskType: CodeListUsageTaskType.Data,
  taskId: 'taskName',
  layoutName: 'layoutName',
  componentIds,
};
const codeListIdSources1: CodeListIdSource[] = [codeListIdSource];
const codeListIdSources2: CodeListIdSource[] = [...codeListIdSources1];

describe('utils', () => {
  describe('getCodeListSourcesById', () => {
    it('returns an array of CodeListSources if given Id is present in codeListsUsages array', () => {
      const codeListUsages: CodeListReference[] = [
        { codeListId: codeListId1, codeListIdSources: codeListIdSources1 },
        { codeListId: codeListId2, codeListIdSources: codeListIdSources2 },
      ];
      const codeListSources = getCodeListSourcesById(codeListUsages, codeListId1);

      expect(codeListSources).toBe(codeListIdSources1);
      expect(codeListSources).not.toBe(codeListIdSources2);
    });

    it('returns an empty array if given Id is not present in codeListsUsages array', () => {
      const codeListUsages: CodeListReference[] = [
        { codeListId: codeListId2, codeListIdSources: codeListIdSources2 },
      ];
      const codeListSources = getCodeListSourcesById(codeListUsages, codeListId1);
      expect(codeListSources).toEqual([]);
    });

    it('returns an empty array if codeListsUsages array is empty', () => {
      const codeListSources = getCodeListSourcesById([], codeListId1);
      expect(codeListSources).toEqual([]);
    });

    it('returns an empty array if codeListUsages and codeListTitle are undefined', () => {
      const codeListSources = getCodeListSourcesById(undefined, undefined);
      expect(codeListSources).toEqual([]);
    });
  });

  describe('getCodeListUsageCount', () => {
    it('returns the total count of all component IDs across all codeListSources', () => {
      const codeListSources: CodeListIdSource[] = [
        { ...codeListIdSource, componentIds: ['id1', 'id2', 'id3'] },
        { ...codeListIdSource, componentIds: ['id4', 'id5'] },
      ];

      const usageCount = getCodeListUsageCount(codeListSources);

      expect(usageCount).toBe(5);
    });

    it('returns 0 if codeListSources array is empty', () => {
      const codeListSources: CodeListIdSource[] = [];

      const usageCount = getCodeListUsageCount(codeListSources);

      expect(usageCount).toBe(0);
    });

    it('returns 0 if all componentIds arrays are empty', () => {
      const codeListSources: CodeListIdSource[] = [
        { ...codeListIdSource, componentIds: [] },
        { ...codeListIdSource, componentIds: [] },
      ];

      const usageCount = getCodeListUsageCount(codeListSources);

      expect(usageCount).toBe(0);
    });

    it('handles a single codeListSource with multiple component IDs', () => {
      const codeListSources: CodeListIdSource[] = [
        { ...codeListIdSource, componentIds: ['id1', 'id2'] },
      ];

      const usageCount = getCodeListUsageCount(codeListSources);

      expect(usageCount).toBe(2);
    });

    it('handles a single codeListSource with no component IDs', () => {
      const codeListSources: CodeListIdSource[] = [{ ...codeListIdSource, componentIds: [] }];

      const usageCount = getCodeListUsageCount(codeListSources);

      expect(usageCount).toBe(0);
    });
  });

  describe('getUsageTaskTypeTextKey', () => {
    it('returns correct text key for Data task type', () => {
      const result = getUsageTaskTypeTextKey(CodeListUsageTaskType.Data);
      expect(result).toBe(
        'app_content_library.code_lists_with_text_resources.code_list_usage_table_task_type_data',
      );
    });

    it('returns correct text key for Signing task type', () => {
      const result = getUsageTaskTypeTextKey(CodeListUsageTaskType.Signing);
      expect(result).toBe(
        'app_content_library.code_lists_with_text_resources.code_list_usage_table_task_type_signing',
      );
    });

    it('falls back to input string when given parameter does not match a valid task type', () => {
      // @ts-expect-error
      const result = getUsageTaskTypeTextKey('confirmation');
      expect(result).toBe('confirmation');
    });
  });

  describe('filterCodeLists', () => {
    const codeLists: CodeListData[] = [
      { title: 'Fruits' },
      { title: 'Vegetables' },
      { title: 'Dairy Products' },
      { title: 'Frozen Foods' },
    ];

    it('should return all code lists when the search string is empty', () => {
      const result = filterCodeLists(codeLists, '');
      expect(result).toEqual(codeLists);
    });

    it('should filter code lists by exact match', () => {
      const result = filterCodeLists(codeLists, 'Fruits');
      expect(result).toEqual([{ title: 'Fruits' }]);
    });

    it('should filter code lists by partial match', () => {
      const result = filterCodeLists(codeLists, 'Food');
      expect(result).toEqual([{ title: 'Frozen Foods' }]);
    });

    it('should filter code lists case-insensitively', () => {
      const result = filterCodeLists(codeLists, 'fruits');
      expect(result).toEqual([{ title: 'Fruits' }]);
    });

    it('should return an empty array when no matches are found', () => {
      const result = filterCodeLists(codeLists, 'Meat');
      expect(result).toEqual([]);
    });

    it('should support an empty code list array', () => {
      const result = filterCodeLists([], 'Fruits');
      expect(result).toEqual([]);
    });

    it('should support special characters in search strings', () => {
      const specialCharacterCodeLists: CodeListData[] = [
        { title: 'Cakes & Cookies' },
        { title: 'Ice-Cream' },
      ];
      const result = filterCodeLists(specialCharacterCodeLists, '&');
      expect(result).toEqual([{ title: 'Cakes & Cookies' }]);
    });
  });

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
