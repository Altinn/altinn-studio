import { ArrayUtils, typedLocalStorage } from '@studio/pure-functions';
import { FeatureFlag, experimentalFeatureFlags } from './FeatureFlag';

export const FEATURE_FLAGS_KEY = 'featureFlags';
export const EXPERIMENTAL_FEATURES_MODE_KEY = 'experimentalFeaturesMode';

/**
 * In the "all" mode, every experimental flag is on, including flags added later.
 * In the "custom" mode, only the flags the user has turned on are on.
 */
export type ExperimentalFeaturesMode = 'all' | 'custom';

export function retrieveFeatureFlags(): FeatureFlag[] {
  const flagsFromUrl = getFlagsFromUrl();
  const flagsFromLocalStorage = getFlagsFromLocalStorage();
  const flagsFromMode =
    retrieveExperimentalFeaturesMode() === 'all' ? [...experimentalFeatureFlags] : [];
  const allFlags = [...flagsFromUrl, ...flagsFromLocalStorage, ...flagsFromMode];
  return ArrayUtils.removeDuplicates(allFlags);
}

export function retrieveExperimentalFeaturesMode(): ExperimentalFeaturesMode {
  const storedMode = typedLocalStorage.getItem<unknown>(EXPERIMENTAL_FEATURES_MODE_KEY);
  return storedMode === 'all' ? 'all' : 'custom';
}

export const setExperimentalFeaturesModeInLocalStorage = (mode: ExperimentalFeaturesMode): void =>
  typedLocalStorage.setItem<ExperimentalFeaturesMode>(EXPERIMENTAL_FEATURES_MODE_KEY, mode);

/**
 * Turns a flag off. When the flag is on because the "all" mode is chosen, the mode changes to
 * "custom" with every other experimental flag still on, so that only the given flag changes.
 */
export const turnOffFeatureFlag = (featureFlag: FeatureFlag): void => {
  const isOnByMode =
    retrieveExperimentalFeaturesMode() === 'all' && experimentalFeatureFlags.includes(featureFlag);
  if (isOnByMode) {
    const flagsToKeep = ArrayUtils.removeDuplicates([
      ...getFlagsFromLocalStorage(),
      ...experimentalFeatureFlags,
    ]);
    updateFlagsInStorage(ArrayUtils.removeItemByValue(flagsToKeep, featureFlag));
    setExperimentalFeaturesModeInLocalStorage('custom');
  } else {
    removeFeatureFlagFromLocalStorage(featureFlag);
  }
};

function getFlagsFromUrl(): FeatureFlag[] {
  const urlParams = new URLSearchParams(window.location.search);
  const featureParam = urlParams.get(FEATURE_FLAGS_KEY);
  const features = featureParam ? featureParam.split(',') : [];
  return filterValidFlags(features);
}

function getFlagsFromLocalStorage(): FeatureFlag[] {
  const storageItem = typedLocalStorage.getItem<unknown>(FEATURE_FLAGS_KEY) || [];
  return ArrayUtils.isArrayOfStrings(storageItem) ? filterValidFlags(storageItem) : [];
}

const filterValidFlags = (flags: string[]): FeatureFlag[] => flags.filter(isFeatureFlag);

const isFeatureFlag = (str: string): str is FeatureFlag =>
  Object.values(FeatureFlag).includes(str as FeatureFlag);

export const addFeatureFlagToLocalStorage = (featureFlag: FeatureFlag): void => {
  const updatedFlags = [...getFlagsFromLocalStorage(), featureFlag];
  updateFlagsInStorage(updatedFlags);
};

export const removeFeatureFlagFromLocalStorage = (featureFlag: FeatureFlag): void => {
  const updatedFlags = ArrayUtils.removeItemByValue(getFlagsFromLocalStorage(), featureFlag);
  updateFlagsInStorage(updatedFlags);
};

const updateFlagsInStorage = (flags: FeatureFlag[]): void =>
  typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, flags);
