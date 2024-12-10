import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { FileNameError } from '../types/FileNameError';
import { DATA_MODEL_NAME_REGEX } from 'app-shared/constants';
import { FileNameUtils } from '@studio/pure-functions';

export const doesFileExistInMetadataWithClassRef = (
  appMetadata: ApplicationMetadata,
  fileNameWithoutExtension: string,
): boolean => {
  return Boolean(
    appMetadata.dataTypes
      ?.filter((dataType) => dataType.appLogic?.classRef !== undefined)
      .find((dataType) => dataType.id === fileNameWithoutExtension),
  );
};

export const doesFileExistInMetadataWithoutClassRef = (
  appMetadata: ApplicationMetadata,
  fileNameWithoutExtension: string,
): boolean => {
  return Boolean(
    appMetadata.dataTypes
      ?.filter((dataType) => dataType.appLogic?.classRef === undefined)
      .find((dataType) => dataType.id.toLowerCase() === fileNameWithoutExtension.toLowerCase()),
  );
};

export const extractDataTypeNamesFromAppMetadata = (
  appMetadata?: ApplicationMetadata,
): string[] => {
  return appMetadata?.dataTypes?.map((dataType) => dataType.id) || [];
};
