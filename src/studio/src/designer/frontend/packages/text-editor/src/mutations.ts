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
  resourceFile: TextResourceFile,
  newEntry: TextResourceEntry
): TextResourceFile => {
  const updatedFile = deepCopy(resourceFile);
  const existingEntryIndex = updatedFile.resources.findIndex((e) => e.id === newEntry.id);
  if (updatedFile.resources[existingEntryIndex]) {
    updatedFile.resources[existingEntryIndex].value = newEntry.value;
    updatedFile.resources[existingEntryIndex].variables = newEntry.variables;
  } else {
    updatedFile.resources.push(newEntry);
  }
  return updatedFile;
};

export const updateTextEntryId = (resourceFile: TextResourceFile, oldId: string, newId: string) => {
  const updatedFile = deepCopy(resourceFile);
  const existingEntryIndex = updatedFile.resources.findIndex((e) => e.id === oldId);
  if (updatedFile.resources[existingEntryIndex]) {
    updatedFile.resources[existingEntryIndex].id = newId;
    return updatedFile;
  } else {
    throw Error("Can't find this text-id");
  }
};
