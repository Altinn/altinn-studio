import {
  computeSelectedOption,
  convertMetadataListToOptionGroups,
  convertMetadataListToOptions,
  convertMetadataToOption,
  extractModelNamesFromMetadataList,
  filterOutXsdDataIfJsonDataExist,
  findMetadataOptionByRelativeUrl,
  findNewMetadataItem,
  groupMetadataOptions,
  mergeJsonAndXsdData,
  metadataItemExists,
} from './metadataUtils';
import {
  datamodel1NameMock,
  datamodel2NameMock,
  jsonMetadata1Mock,
  jsonMetadata2Mock,
  xsdMetadata1Mock,
  xsdMetadata2Mock,
} from '../../packages/schema-editor/test/mocks/metadataMocks';
import type { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';
import type { MetadataOption } from '../types/MetadataOption';

// Test data:
const jsonMetadataOption1: MetadataOption = {
  label: datamodel1NameMock,
  value: jsonMetadata1Mock,
};
const jsonMetadataOption2: MetadataOption = {
  label: datamodel1NameMock,
  value: jsonMetadata2Mock,
};
const xsdMetadataOption1: MetadataOption = {
  label: `${datamodel1NameMock} (XSD)`,
  value: xsdMetadata1Mock,
};
const xsdMetadataOption2: MetadataOption = {
  label: `${datamodel1NameMock} (XSD)`,
  value: xsdMetadata2Mock,
};

describe('metadataUtils', () => {
  describe('filterOutXsdDataIfJsonDataExist', () => {
    it('Filters out items from the Xsd data list if there are items in the Json data list with the same name', () => {
      const jsonData = [jsonMetadata1Mock];
      const xsdData = [xsdMetadata1Mock, xsdMetadata2Mock];
      const result = filterOutXsdDataIfJsonDataExist(jsonData, xsdData);
      expect(result).toEqual([xsdMetadata2Mock]);
    });
  });

  describe('mergeJsonAndXsdData', () => {
    it('Merges the Json and Xsd metadata lists', () => {
      const jsonData = [jsonMetadata1Mock];
      const xsdData = [xsdMetadata1Mock, xsdMetadata2Mock];
      const result = mergeJsonAndXsdData(jsonData, xsdData);
      expect(result).toEqual([jsonMetadata1Mock, xsdMetadata2Mock]);
    });
  });

  describe('convertMetadataToOption', () => {
    it('Converts a Json metadata item to an MetadataOption object with the datamodel name as the label', () => {
      const result = convertMetadataToOption(jsonMetadata1Mock);
      expect(result).toEqual({
        label: datamodel1NameMock,
        value: jsonMetadata1Mock,
      });
    });

    it('Converts an Xsd metadata item to an MetadataOption object with the datamodel name suffixed with " (XSD)" as the label', () => {
      const result = convertMetadataToOption(xsdMetadata1Mock);
      expect(result).toEqual({
        label: `${datamodel1NameMock} (XSD)`,
        value: xsdMetadata1Mock,
      });
    });
  });

  describe('convertMetadataListToOptions', () => {
    it('Converts a list of metadata items to a list of MetadataOption objects', () => {
      const result = convertMetadataListToOptions([xsdMetadata1Mock, jsonMetadata2Mock]);
      expect(result).toEqual([
        {
          label: `${datamodel1NameMock} (XSD)`,
          value: xsdMetadata1Mock,
        },
        {
          label: datamodel2NameMock,
          value: jsonMetadata2Mock,
        },
      ]);
    });
  });

  describe('groupMetadataOptions', () => {
    it('Groups metadata options by file type', () => {
      const list = [
        jsonMetadataOption1,
        jsonMetadataOption2,
        xsdMetadataOption1,
        xsdMetadataOption2,
      ];
      const result = groupMetadataOptions(list);
      expect(result).toEqual([
        {
          label: 'JSONSchema',
          options: [jsonMetadataOption1, jsonMetadataOption2],
        },
        {
          label: 'XSD',
          options: [xsdMetadataOption1, xsdMetadataOption2],
        },
      ]);
    });

    it('Does not include the group if it has no options', () => {
      const list = [jsonMetadataOption1, jsonMetadataOption2];
      const result = groupMetadataOptions(list);
      expect(result).toEqual([
        {
          label: 'JSONSchema',
          options: [jsonMetadataOption1, jsonMetadataOption2],
        },
      ]);
    });
  });

  describe('convertMetadataListToOptionGroups', () => {
    it('Converts a list of metadata items to grouped lists of MetadataOption objects', () => {
      const result = convertMetadataListToOptionGroups([xsdMetadata1Mock, jsonMetadata2Mock]);
      expect(result).toEqual([
        {
          label: 'JSONSchema',
          options: [
            {
              label: datamodel2NameMock,
              value: jsonMetadata2Mock,
            },
          ],
        },
        {
          label: 'XSD',
          options: [
            {
              label: `${datamodel1NameMock} (XSD)`,
              value: xsdMetadata1Mock,
            },
          ],
        },
      ]);
    });
  });

  describe('extractModelNamesFromMetadataList', () => {
    it('Extracts the model names from a list of metadata items', () => {
      const items: DatamodelMetadata[] = [
        jsonMetadata1Mock,
        jsonMetadata2Mock,
        xsdMetadata1Mock,
        xsdMetadata2Mock,
      ];
      const result = extractModelNamesFromMetadataList(items);
      expect(result).toEqual([datamodel1NameMock, datamodel2NameMock]);
    });
  });

  describe('findNewMetadataItem', () => {
    it('Finds the new metadata item in a list of metadata items', () => {
      const oldItems = [jsonMetadata1Mock];
      const newItems = [jsonMetadata1Mock, jsonMetadata2Mock];
      expect(findNewMetadataItem(oldItems, newItems)).toEqual(jsonMetadata2Mock);
    });

    it('Returns undefined if there are no new metadata items in the list', () => {
      const items = [jsonMetadata1Mock, jsonMetadata2Mock];
      expect(findNewMetadataItem(items, items)).toBeUndefined();
    });
  });

  describe('metadataItemExists', () => {
    it('Returns true if the metadata item exists in the list', () => {
      const items = [jsonMetadata1Mock, jsonMetadata2Mock];
      expect(metadataItemExists(items, jsonMetadata1Mock)).toBe(true);
      expect(metadataItemExists(items, jsonMetadata2Mock)).toBe(true);
    });

    it('Returns false if the metadata item does not exist in the list', () => {
      expect(metadataItemExists([], jsonMetadata1Mock)).toBe(false);
      expect(metadataItemExists([jsonMetadata1Mock], jsonMetadata2Mock)).toBe(false);
    });
  });

  describe('computeSelectedOption', () => {
    it('Returns undefined if there are no current metadata items and the current selected option is set', () => {
      const currentSelectedOption = convertMetadataToOption(jsonMetadata1Mock);
      expect(computeSelectedOption(currentSelectedOption, [], [jsonMetadata1Mock])).toBeUndefined();
      expect(computeSelectedOption(currentSelectedOption, [], [])).toBeUndefined();
      expect(computeSelectedOption(currentSelectedOption, [], undefined)).toBeUndefined();
      expect(computeSelectedOption(currentSelectedOption, undefined, undefined)).toBeUndefined();
      expect(computeSelectedOption(currentSelectedOption, undefined, [])).toBeUndefined();
    });

    it('Returns undefined if there are no current metadata items and the current selected option is undefined', () => {
      expect(computeSelectedOption(undefined, [], [jsonMetadata1Mock])).toBeUndefined();
      expect(computeSelectedOption(undefined, [], [])).toBeUndefined();
      expect(computeSelectedOption(undefined, [], undefined)).toBeUndefined();
      expect(computeSelectedOption(undefined, undefined, undefined)).toBeUndefined();
      expect(computeSelectedOption(undefined, undefined, [])).toBeUndefined();
    });

    it('Returns the new option if there is a new metadata item', () => {
      const currentSelectedOption = convertMetadataToOption(jsonMetadata1Mock);
      const newOption = convertMetadataToOption(jsonMetadata2Mock);
      const currentList = [jsonMetadata1Mock, jsonMetadata2Mock];
      const previousList = [jsonMetadata1Mock];
      expect(computeSelectedOption(currentSelectedOption, currentList, previousList)).toEqual(
        newOption,
      );
      expect(computeSelectedOption(undefined, currentList, previousList)).toEqual(newOption);
    });

    it('Returns the first option if the current selected option is undefined', () => {
      const list = [jsonMetadata1Mock, jsonMetadata2Mock];
      expect(computeSelectedOption(undefined, list, list)).toEqual(
        convertMetadataToOption(jsonMetadata1Mock),
      );
    });

    it('Returns the first option if the current selected option is not in the list', () => {
      const currentList = [jsonMetadata1Mock];
      const previousList = [jsonMetadata1Mock, jsonMetadata2Mock];
      const currentSelectedOption = convertMetadataToOption(jsonMetadata2Mock);
      expect(computeSelectedOption(currentSelectedOption, currentList, previousList)).toEqual(
        convertMetadataToOption(jsonMetadata1Mock),
      );
    });

    it('Returns the current option if there is no new metadata item and it exists in the list', () => {
      const list = [jsonMetadata1Mock, jsonMetadata2Mock];
      const currentSelectedOption = convertMetadataToOption(jsonMetadata1Mock);
      expect(computeSelectedOption(currentSelectedOption, list, list)).toEqual(
        currentSelectedOption,
      );
    });
  });

  describe('findMetadataOptionByRelativeUrl', () => {
    const list = [jsonMetadataOption1, jsonMetadataOption2, xsdMetadataOption1, xsdMetadataOption2];

    it('Returns the metadata option with the given relative URL', () => {
      const { repositoryRelativeUrl } = jsonMetadataOption2.value;
      const result = findMetadataOptionByRelativeUrl(list, repositoryRelativeUrl);
      expect(result).toEqual(jsonMetadataOption2);
    });

    it('Returns undefined if there is no metadata option with the given relative URL', () => {
      const result = findMetadataOptionByRelativeUrl(list, 'bla/bla/bla');
      expect(result).toBeUndefined();
    });
  });
});
