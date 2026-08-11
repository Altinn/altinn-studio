import type { PrefillConfig, PrefillFieldMap } from 'app-shared/types/PrefillConfig';
import { PrefillSource } from 'app-shared/types/PrefillConfig';

/**
 * Returns a new prefill config where any existing mapping to the given data model field has been removed.
 */
export const removePrefillMapping = (
  prefillConfig: PrefillConfig,
  dataBindingName: string,
): PrefillConfig => {
  const updatedConfig: PrefillConfig = { ...prefillConfig };
  for (const source of Object.values(PrefillSource)) {
    const sourceConfig = updatedConfig[source];
    if (!sourceConfig) {
      continue;
    }
    const key = Object.keys(sourceConfig).find((k) => sourceConfig[k] === dataBindingName);
    if (!key) {
      continue;
    }
    const remainingFields = Object.fromEntries(
      Object.entries(sourceConfig).filter(([fieldKey]) => fieldKey !== key),
    );
    if (Object.keys(remainingFields).length > 0) {
      updatedConfig[source] = remainingFields;
    } else {
      delete updatedConfig[source];
    }
  }
  return updatedConfig;
};

/**
 * Returns a new prefill config where the given data model field is mapped to the given source and key,
 * replacing any previous mapping for that field.
 */
export const setPrefillMapping = (
  prefillConfig: PrefillConfig,
  dataBindingName: string,
  source: PrefillSource,
  key: string,
): PrefillConfig => {
  const configWithoutExistingMapping = removePrefillMapping(prefillConfig, dataBindingName);
  return {
    ...configWithoutExistingMapping,
    [source]: {
      ...configWithoutExistingMapping[source],
      [key]: dataBindingName,
    },
  };
};

/**
 * Returns a new prefill config where every mapped data model field path starting with
 * `oldDataBindingName` (the exact field itself, or one of its descendants when a parent field was
 * renamed) has that prefix replaced with `newDataBindingName`. Returns the original config
 * unchanged (same reference) if nothing needed to be renamed.
 */
export const renamePrefillMappings = (
  prefillConfig: PrefillConfig,
  oldDataBindingName: string,
  newDataBindingName: string,
): PrefillConfig => {
  const renameDataBindingName = (dataBindingName: string): string => {
    if (dataBindingName === oldDataBindingName) {
      return newDataBindingName;
    }
    if (dataBindingName.startsWith(`${oldDataBindingName}.`)) {
      return newDataBindingName + dataBindingName.slice(oldDataBindingName.length);
    }
    return dataBindingName;
  };

  let hasChanges = false;
  const updatedConfig: PrefillConfig = { ...prefillConfig };
  for (const source of Object.values(PrefillSource)) {
    const sourceConfig = updatedConfig[source];
    if (!sourceConfig) {
      continue;
    }
    let sourceHasChanges = false;
    const updatedSourceConfig: PrefillFieldMap = {};
    for (const [key, dataBindingName] of Object.entries(sourceConfig)) {
      const renamedDataBindingName = renameDataBindingName(dataBindingName);
      if (renamedDataBindingName !== dataBindingName) {
        sourceHasChanges = true;
      }
      updatedSourceConfig[key] = renamedDataBindingName;
    }
    if (sourceHasChanges) {
      updatedConfig[source] = updatedSourceConfig;
      hasChanges = true;
    }
  }
  return hasChanges ? updatedConfig : prefillConfig;
};
