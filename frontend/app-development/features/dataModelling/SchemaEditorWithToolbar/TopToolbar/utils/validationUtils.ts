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

export const findFileNameError = (
  fileName: string,
  appMetadata: ApplicationMetadata,
): FileNameError | null => {
  const fileNameWithoutExtension = FileNameUtils.removeExtension(fileName);
  if (!isNameFormatValid(fileNameWithoutExtension)) {
    return 'invalidFileName';
  } else if (doesFileExistInMetadata(appMetadata, fileNameWithoutExtension)) {
    return 'fileExists';
  } else {
    return null;
  }
};

const isNameFormatValid = (fileNameWithoutExtension: string): boolean => {
  return Boolean(fileNameWithoutExtension.match(DATA_MODEL_NAME_REGEX));
};

const doesFileExistInMetadata = (
  appMetadata: ApplicationMetadata,
  fileNameWithoutExtension: string,
): boolean => appMetadata.dataTypes?.some((dataType) => dataType.id === fileNameWithoutExtension);

export const extractDataTypeNamesFromAppMetadata = (
  appMetadata?: ApplicationMetadata,
): string[] => {
  return appMetadata?.dataTypes?.map((dataType) => dataType.id) || [];
};
