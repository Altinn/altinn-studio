import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { removeExtension } from 'app-shared/utils/filenameUtils';
import type { FileNameError } from './FileNameError';

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
  const fileNameWithoutExtension = removeExtension(fileName);
  if (!isNameFormatValid(fileNameWithoutExtension)) {
    return 'invalidFileName';
  } else if (doesFileExistInMetadata(appMetadata, fileNameWithoutExtension)) {
    return 'fileExists';
  } else {
    return null;
  }
};

const isNameFormatValid = (fileNameWithoutExtension: string): boolean => {
  const fileNameRegex: RegExp = /^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/;
  return Boolean(fileNameWithoutExtension.match(fileNameRegex));
};

const doesFileExistInMetadata = (
  appMetadata: ApplicationMetadata,
  fileNameWithoutExtension: string,
): boolean => appMetadata.dataTypes?.some((dataType) => dataType.id === fileNameWithoutExtension);
