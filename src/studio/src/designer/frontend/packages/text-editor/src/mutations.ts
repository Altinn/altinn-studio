import type { TextResourceEntry, TextResourceFile } from './types';
import { deepCopy, removeArrayElement } from 'app-shared/pure';

export const findTextEntry = (
  translations: TextResourceFile,
  entryId: string
): TextResourceEntry | undefined => translations.resources.find((entry) => entry.id === entryId);

export const removeTextEntry = (
  translations: TextResourceFile,
  entryId: string
): TextResourceFile => {
  const updatedTranslations = deepCopy(translations);
  updatedTranslations.resources = removeArrayElement(
    translations.resources,
    findTextEntry(translations, entryId)
  );
  return updatedTranslations;
};

export const upsertTextEntry = (
  translations: TextResourceFile,
  newEntry: TextResourceEntry
): TextResourceFile => {
  const updatedTranslations = deepCopy(translations);
  const existingEntryIndex = updatedTranslations.resources.findIndex(
    (entry) => entry.id === newEntry.id
  );
  if (updatedTranslations.resources[existingEntryIndex]) {
    updatedTranslations.resources[existingEntryIndex].value = newEntry.value;
    updatedTranslations.resources[existingEntryIndex].variables = newEntry.variables;
  } else {
    updatedTranslations.resources.push(newEntry);
  }
  return updatedTranslations;
};
