import { DatamodelMetadata, DatamodelMetadataJson, DatamodelMetadataXsd } from 'app-shared/types/DatamodelMetadata';
import { replaceEnd } from 'app-shared/utils/stringUtils';
import { MetadataOption } from '@altinn/schema-editor/types/MetadataOption';
import { MetadataOptionsGroup } from '@altinn/schema-editor/types/MetadataOptionsGroup';
import { removeDuplicates } from 'app-shared/utils/arrayUtils';

/**
 * Filters out items from the Xsd data list if there are items in the Json data list with the same name.
 * @param jsonData The Json data list.
 * @param xsdData The Xsd data list.
 * @returns The filtered Xsd data list.
 */
export const filterOutXsdDataIfJsonDataExist = (
  jsonData: DatamodelMetadataJson[],
  xsdData: DatamodelMetadataXsd[]
): DatamodelMetadataXsd[] => xsdData.filter(
  ({ fileName }) =>
    !jsonData.find(
      ({ fileName: jsonFileName }) => jsonFileName === replaceEnd(fileName, '.xsd', '.schema.json')
    )
);

/**
 * Merges the Json and Xsd data lists, excluding the Xsd items of which there are corresponding Json items.
 * @param jsonData The Json data list.
 * @param xsdData The Xsd data list.
 * @returns The merged Json and Xsd data list.
 */
export const mergeJsonAndXsdData = (
  jsonData: DatamodelMetadataJson[],
  xsdData: DatamodelMetadataXsd[]
): DatamodelMetadata[] => [...jsonData, ...filterOutXsdDataIfJsonDataExist(jsonData, xsdData)];

/**
 * Converts a DatamodelMetadata object to a MetadataOption object.
 * @param metadata The DatamodelMetadata object to convert.
 * @returns The MetadataOption object.
 */
export const convertMetadataToOption = (metadata: DatamodelMetadata): MetadataOption => {
  const label = metadata.fileType === '.xsd' ? `${metadata.fileName} (XSD)` : metadata.fileName;
  return { value: metadata, label };
}

/**
 * Converts a list of DatamodelMetadata objects to a list of MetadataOption objects.
 * @param metadataList The list of DatamodelMetadata objects to convert.
 * @returns The list of MetadataOption objects.
 */
export const convertMetadataListToOptions = (metadataList: DatamodelMetadata[]): MetadataOption[] =>
  metadataList?.map(convertMetadataToOption);

/**
 * Groups metadata options by file type.
 * @param metadataOptions The metadata options to group.
 * @returns A list of metadata option groups.
 */
export const groupMetadataOptions = (metadataOptions: MetadataOption[]): MetadataOptionsGroup[] => [
  {
    label: 'JSONSchema',
    options: metadataOptions.filter(({ value }) => value.fileType === '.json'),
  },
  {
    label: 'XSD',
    options: metadataOptions.filter(({ value }) => value.fileType === '.xsd'),
  },
];

/**
 * Converts a list of DatamodelMetadata objects to grouped lists of MetadataOption objects.
 * @param metadataList The list of DatamodelMetadata objects to convert.
 * @returns A list of MetadataOptionsGroup objects.
 */
export const convertMetadataListToOptionGroups = (metadataList: DatamodelMetadata[]): MetadataOptionsGroup[] =>
  groupMetadataOptions(convertMetadataListToOptions(metadataList));

/**
 * Extracts all model names from a list of DatamodelMetadata objects.
 * @param metadataList The list of DatamodelMetadata objects to extract model names from.
 * @returns A list of model names.
 */
export const extractModelNamesFromMetadataList = (metadataList: DatamodelMetadata[]): string[] =>
  removeDuplicates(metadataList?.map(({ fileName }) => fileName.replace(/\.((schema\.json)|(xsd))$/, '')));
