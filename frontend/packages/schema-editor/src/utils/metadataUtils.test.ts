import {
  convertMetadataListToOptionGroups,
  convertMetadataListToOptions,
  convertMetadataToOption,
  extractModelNamesFromMetadataList,
  filterOutXsdDataIfJsonDataExist,
  groupMetadataOptions,
  mergeJsonAndXsdData
} from '@altinn/schema-editor/utils/metadataUtils';
import { MetadataOption } from '@altinn/schema-editor/types/MetadataOption';
import {
  datamodel1NameMock, datamodel2NameMock,
  jsonMetadata1Mock,
  jsonMetadata2Mock,
  xsdMetadata1Mock,
  xsdMetadata2Mock
} from '../../test/mocks/metadataMocks';
import { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';

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
    it('Converts a Json metadata item to an MetadataOption object with the file name as the label', () => {
      const result = convertMetadataToOption(jsonMetadata1Mock);
      expect(result).toEqual({
        label: jsonMetadata1Mock.fileName,
        value: jsonMetadata1Mock,
      });
    });

    it('Converts an Xsd metadata item to an MetadataOption object with the file name suffixed with " (XSD)" as the label', () => {
      const result = convertMetadataToOption(xsdMetadata1Mock);
      expect(result).toEqual({
        label: `${xsdMetadata1Mock.fileName} (XSD)`,
        value: xsdMetadata1Mock,
      });
    });
  });

  describe('convertMetadataListToOptions', () => {
    it('Converts a list of metadata items to a list of MetadataOption objects', () => {
      const result = convertMetadataListToOptions([xsdMetadata1Mock, jsonMetadata2Mock]);
      expect(result).toEqual([
        {
          label: `${xsdMetadata1Mock.fileName} (XSD)`,
          value: xsdMetadata1Mock,
        },
        {
          label: jsonMetadata2Mock.fileName,
          value: jsonMetadata2Mock,
        }
      ]);
    });
  });

  describe('groupMetadataOptions', () => {
    it('Groups metadata options by file type', () => {
      const jsonMetadataOption1: MetadataOption = {
        label: jsonMetadata1Mock.fileName,
        value: jsonMetadata1Mock,
      };
      const jsonMetadataOption2: MetadataOption = {
        label: jsonMetadata2Mock.fileName,
        value: jsonMetadata2Mock,
      };
      const xsdMetadataOption1: MetadataOption = {
        label: `${xsdMetadata1Mock.fileName} (XSD)`,
        value: xsdMetadata1Mock,
      };
      const xsdMetadataOption2: MetadataOption = {
        label: `${xsdMetadata2Mock.fileName} (XSD)`,
        value: xsdMetadata2Mock,
      };
      const list = [jsonMetadataOption1, jsonMetadataOption2, xsdMetadataOption1, xsdMetadataOption2];
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
  });

  describe('convertMetadataListToOptionGroups', () => {
    it('Converts a list of metadata items to grouped lists of MetadataOption objects', () => {
      const result = convertMetadataListToOptionGroups([xsdMetadata1Mock, jsonMetadata2Mock]);
      expect(result).toEqual([
        {
          label: 'JSONSchema',
          options: [
            {
              label: jsonMetadata2Mock.fileName,
              value: jsonMetadata2Mock,
            },
          ],
        },
        {
          label: 'XSD',
          options: [
            {
              label: `${xsdMetadata1Mock.fileName} (XSD)`,
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
});
