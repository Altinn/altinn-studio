import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import { PrefillSource } from 'app-shared/types/PrefillConfig';

export interface PrefillMapping {
  source: PrefillSource;
  key: string;
}

/**
 * Finds the source and key mapped to the given data model field (if any) within a prefill config.
 */
export const findPrefillMapping = (
  prefillConfig: PrefillConfig,
  dataBindingName: string,
): PrefillMapping | undefined => {
  for (const source of Object.values(PrefillSource)) {
    const sourceConfig = prefillConfig[source];
    const key = sourceConfig && Object.keys(sourceConfig).find((k) => sourceConfig[k] === dataBindingName);
    if (key) {
      return { source, key };
    }
  }
  return undefined;
};

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
