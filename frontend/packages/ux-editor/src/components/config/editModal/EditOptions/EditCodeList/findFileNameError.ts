import { removeExtension } from 'app-shared/utils/filenameUtils';

export type FileNameError = 'invalidFileName' | 'fileExists';

export const findFileNameError = (
  optionListIds: string[],
  fileName: string,
): FileNameError | null => {
  const fileNameWithoutExtension = removeExtension(fileName);

  if (!isFilenameValid(fileNameWithoutExtension)) {
    return 'invalidFileName';
  } else if (isFileNameDuplicate(optionListIds, fileNameWithoutExtension)) {
    return 'fileExists';
  } else {
    return null;
  }
};

const isFilenameValid = (fileName: string): boolean => {
  return Boolean(fileName.match(/^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/));
};

const isFileNameDuplicate = (
  optionListIds: string[],
  fileNameWithoutExtension: string,
): boolean => {
  return optionListIds.some((option) => option === fileNameWithoutExtension);
};
