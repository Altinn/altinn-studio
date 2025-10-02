import { ArrayUtils, typedLocalStorage } from '@studio/pure-functions';
import { FeatureFlag } from './FeatureFlag';

export const FEATURE_FLAGS_KEY = 'featureFlags';

export function retrieveFeatureFlags(): FeatureFlag[] {
  const flagsFromUrl = featureFlagsFromUrl();
  const flagsFromLocalStorage = featureFlagsFromLocalStorage();
  const allFlags = [...flagsFromUrl, ...flagsFromLocalStorage];
  return ArrayUtils.removeDuplicates(allFlags);
}

function featureFlagsFromUrl(): FeatureFlag[] {
  const urlParams = new URLSearchParams(window.location.search);
  const featureParam = urlParams.get(FEATURE_FLAGS_KEY);
  const features = featureParam ? featureParam.split(',') : [];
  return filterValidFlags(features);
}

function featureFlagsFromLocalStorage(): FeatureFlag[] {
  const featureFlagsFromStorage = typedLocalStorage.getItem<string[]>(FEATURE_FLAGS_KEY) || [];
  return filterValidFlags(featureFlagsFromStorage);
}

const filterValidFlags = (flags: string[]): FeatureFlag[] => flags.filter(isFeatureFlag);

const isFeatureFlag = (str: string): str is FeatureFlag =>
  Object.values(FeatureFlag).includes(str as FeatureFlag);
