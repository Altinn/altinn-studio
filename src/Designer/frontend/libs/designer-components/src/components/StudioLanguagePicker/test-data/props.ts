import type { StudioLanguagePickerProps, StudioLanguagePickerTexts } from '../StudioLanguagePicker';

export const twoLetterCodes: string[] = ['nb', 'nn', 'se', 'en'];
export const threeLetterCodes: string[] = ['nob', 'nno', 'sme', 'eng'];
export const texts: StudioLanguagePickerTexts = {
  add: 'Add',
  errorCodeExists: 'This code exists already',
  errorEmpty: 'No code is given',
  label: 'Language',
  newLanguageCode: 'New language code',
  remove: 'Remove',
  removeConfirmMessage: (language: string) =>
    `Are you sure you want to remove the language "${language}"?`,
};
export const defaultProps: StudioLanguagePickerProps = {
  languageCodes: twoLetterCodes,
  onAdd: () => {},
  onRemove: () => {},
  texts,
};
