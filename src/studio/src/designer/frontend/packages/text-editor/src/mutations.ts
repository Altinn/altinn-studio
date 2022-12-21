import type { TextResourceEntry, TextResourceFile, TextResourceMap } from './types';
import { deepCopy } from 'app-shared/pure';

export const removeTextEntry = (texts: TextResourceMap, entryId: string) => {
  const updatedTranslations = { ...texts };
  delete updatedTranslations[entryId];
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
