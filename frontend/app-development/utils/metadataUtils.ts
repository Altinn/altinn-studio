import type {
  DataModelMetadata,
  DataModelMetadataJson,
  DataModelMetadataXsd,
} from 'app-shared/types/DataModelMetadata';
import { ArrayUtils, StringUtils, FileNameUtils } from '@studio/pure-functions';
import type { MetadataOption } from '../types/MetadataOption';
import type { MetadataOptionsGroup } from '../types/MetadataOptionsGroup';

/**
 * Filters out items from the Xsd data list if there are items in the Json data list with the same name.
 * @param jsonData The Json data list.
 * @param xsdData The Xsd data list.
 * @returns The filtered Xsd data list.
 */
export const filterOutXsdDataIfJsonDataExist = (
  jsonData: DataModelMetadataJson[],
  xsdData: DataModelMetadataXsd[],
): DataModelMetadataXsd[] =>
  xsdData.filter(
    ({ fileName }) =>
      !jsonData.find(
        ({ fileName: jsonFileName }) =>
          jsonFileName === StringUtils.replaceEnd(fileName, '.xsd', '.schema.json'),
      ),
  );

/**
 * Merges the Json and Xsd data lists, excluding the Xsd items of which there are corresponding Json items.
 * @param jsonData The Json data list.
 * @param xsdData The Xsd data list.
 * @returns The merged Json and Xsd data list.
 */
export const mergeJsonAndXsdData = (
  jsonData: DataModelMetadataJson[],
  xsdData: DataModelMetadataXsd[],
): DataModelMetadata[] => [...jsonData, ...filterOutXsdDataIfJsonDataExist(jsonData, xsdData)];

/**
 * Converts a DataModelMetadata object to a MetadataOption object.
 * @param metadata The DataModelMetadata object to convert.
 * @returns The MetadataOption object.
 */
export const convertMetadataToOption = (metadata: DataModelMetadata): MetadataOption => {
  let label = FileNameUtils.removeSchemaExtension(metadata.fileName);
  if (metadata.fileType === '.xsd') {
    label += ' (XSD)';
  }
  return { value: metadata, label };
};

/**
 * Converts a list of DataModelMetadata objects to a list of MetadataOption objects.
 * @param metadataList The list of DataModelMetadata objects to convert.
 * @returns The list of MetadataOption objects.
 */
export const convertMetadataListToOptions = (metadataList: DataModelMetadata[]): MetadataOption[] =>
  metadataList?.map(convertMetadataToOption);

/**
 * Groups metadata options by file type.
 * @param metadataOptions The metadata options to group.
 * @returns A list of metadata option groups.
 */
export const groupMetadataOptions = (metadataOptions: MetadataOption[]): MetadataOptionsGroup[] =>
  (
    [
      {
        label: 'JSONSchema',
        options: metadataOptions.filter(({ value }) => value.fileType === '.json'),
      },
      {
        label: 'XSD',
        options: metadataOptions.filter(({ value }) => value.fileType === '.xsd'),
      },
    ] satisfies MetadataOptionsGroup[]
  ).filter(({ options }) => options.length > 0);

/**
 * Converts a list of DataModelMetadata objects to grouped lists of MetadataOption objects.
 * @param metadataList The list of DataModelMetadata objects to convert.
 * @returns A list of MetadataOptionsGroup objects.
 */
export const convertMetadataListToOptionGroups = (
  metadataList: DataModelMetadata[],
): MetadataOptionsGroup[] => groupMetadataOptions(convertMetadataListToOptions(metadataList));

/**
 * Extracts all model names from a list of DataModelMetadata objects.
 * @param metadataList The list of DataModelMetadata objects to extract model names from.
 * @returns A list of model names.
 */
export const extractModelNamesFromMetadataList = (metadataList: DataModelMetadata[]): string[] =>
  ArrayUtils.removeDuplicates(
    metadataList?.map(({ fileName }) => fileName.replace(/\.((schema\.json)|(xsd))$/, '')),
  );

/**
 * Compares an old and a new list of metadata items and returns the first item of which the file name does not exist in the old list.
 * @param oldMetadataList The old list of metadata items.
 * @param newMetadataList The new list of metadata items.
 * @returns The first item of the new list of which the file name does not exist in the old one or undefined if there is no such item.
 */
export const findNewMetadataItem = (
  oldMetadataList: DataModelMetadata[],
  newMetadataList: DataModelMetadata[],
): DataModelMetadata | undefined =>
  newMetadataList.find(
    ({ fileName }) =>
      !oldMetadataList.find(({ fileName: oldFileName }) => oldFileName === fileName),
  );

/**
 * Checks if the file name of a given item exists in a list of metadata items.
 * @param metadataList The list of metadata items to check.
 * @param item The item to check for.
 * @returns True if an item with the same file name exists in the list, false otherwise.
 */
export const metadataItemExists = (
  metadataList: DataModelMetadata[],
  item: DataModelMetadata,
): boolean => !!metadataList?.find(({ fileName }) => fileName === item.fileName);

/**
 * Computes the option to be selected based on the currently selected option an the current and previous metadata lists.
 * @param currentSelectedOption The currently selected option.
 * @param currentMetadataList The current list of metadata items.
 * @param previousMetadataList The previous list of metadata items.
 * @returns
 *   1. `undefined` if the current list is empty
 *   2. The new option if the current list contains a new item
 *   3. The first item of the current list if the current selected option is undefined or it does not exist in the current list
 *   4. The current selected option otherwise
 */
export const computeSelectedOption = (
  currentSelectedOption?: MetadataOption,
  currentMetadataList?: DataModelMetadata[],
  previousMetadataList?: DataModelMetadata[],
): MetadataOption | undefined => {
  if (!currentMetadataList?.length) return undefined;

  if (currentMetadataList !== previousMetadataList) {
    const newMetadataItem = findNewMetadataItem(previousMetadataList ?? [], currentMetadataList);
    if (newMetadataItem) return convertMetadataToOption(newMetadataItem);
  }

  if (
    !currentSelectedOption ||
    !metadataItemExists(currentMetadataList, currentSelectedOption.value)
  )
    return convertMetadataToOption(currentMetadataList[0]);

  return currentSelectedOption;
};

/**
 * Finds a metadata option by its relative URL.
 * @param metadataOptions The list of metadata options to search in.
 * @param relativeUrl The relative URL to search for.
 * @returns The metadata option with the given relative URL or undefined if there is no such option.
 */
export const findMetadataOptionByRelativeUrl = (
  metadataOptions: MetadataOption[],
  relativeUrl: string,
): MetadataOption | undefined =>
  metadataOptions.find(({ value }) => value.repositoryRelativeUrl === relativeUrl);
