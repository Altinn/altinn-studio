import type { Option } from 'app-shared/types/Option';
import type { CodeListItem } from '@studio/components';
import {
  convertOptionsListToCodeListItemList,
  convertCodeListItemListToOptionsList,
} from './conversionUtils';

// Test data:
const optionsList: Option[] = [
  { value: 'test', label: 'test label', description: 'description', helpText: 'help text' },
];
const codeListItemList: CodeListItem[] = [
  { value: 'test', label: 'test label', description: 'description', helpText: 'help text' },
];

describe('conversionUtils', () => {
  describe('convertOptionsListToCodeListItem', () => {
    it('should return empty list if input is undefined', () => {
      expect(convertOptionsListToCodeListItemList(undefined)).toEqual([]);
    });

    it('should return empty list if input is an empty list', () => {
      expect(convertOptionsListToCodeListItemList([])).toEqual([]);
    });

    it('should return converted list', () => {
      expect(convertOptionsListToCodeListItemList(optionsList)).toStrictEqual(codeListItemList);
    });
  });

  describe('convertCodeListItemListToOptionsList', () => {
    it('should return empty list if input is undefined', () => {
      expect(convertCodeListItemListToOptionsList(undefined)).toEqual([]);
    });

    it('should return empty list if input is an empty list', () => {
      expect(convertCodeListItemListToOptionsList([])).toEqual([]);
    });

    it('should return converted list', () => {
      expect(convertCodeListItemListToOptionsList(codeListItemList)).toStrictEqual(optionsList);
    });
  });
});
