import { removeExtension } from 'app-shared/utils/filenameUtils';

export const validateFileName = (optionListIds: string[], fileName: string): boolean => {
  const fileNameWithoutExtension = removeExtension(fileName);

  if (!isFilenameValid(fileNameWithoutExtension)) {
    return false;
  }
  return !isFileDuplicate(optionListIds, fileNameWithoutExtension);
};

export const isFilenameValid = (fileName: string): boolean => {
  return Boolean(fileName.match(/^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/));
};

export const isFileDuplicate = (
  optionListIds: string[],
  fileNameWithoutExtension: string,
): boolean => {
  return optionListIds.some((option) => option === fileNameWithoutExtension);
};
