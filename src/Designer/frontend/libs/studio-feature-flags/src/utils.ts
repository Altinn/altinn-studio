import { ArrayUtils, typedLocalStorage } from '@studio/pure-functions';
import { FeatureFlag } from './FeatureFlag';

export const FEATURE_FLAGS_KEY = 'featureFlags';

export function retrieveFeatureFlags(): FeatureFlag[] {
  const flagsFromUrl = getFlagsFromUrl();
  const flagsFromLocalStorage = getFlagsFromLocalStorage();
  const allFlags = [...flagsFromUrl, ...flagsFromLocalStorage];
  return ArrayUtils.removeDuplicates(allFlags);
}

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
