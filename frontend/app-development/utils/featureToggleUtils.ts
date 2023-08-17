import { typedLocalStorage } from 'app-shared/utils/webStorage';

const featureFlagKey = 'featureFlags';

// All the features that you want to be toggle on/off should be added here. To ensure that we type check the feature name.
export type SupportedFeatureFlags = 'process';

/*
 * Please add all the features that you want to be toggle on by default here.
 * Remember that all the features that are listed here will be available to the users in production,
 * since this is the default active features.
 */
const defaultActiveFeatures: SupportedFeatureFlags[] = [];

/**
 * @param featureFlag
 * @returns boolean
 * @description This function will check if the feature should be displayed or not. The feature can be toggled on by the url query, by local storage or set as default active feature.
 * @example shouldDisplayFeature('myFeatureName')
 */
export const shouldDisplayFeature = (featureFlag: SupportedFeatureFlags): boolean => {
  return (
    isDefaultActivatedFeature(featureFlag) ||
    isFeatureActivatedByUrl(featureFlag) ||
    isFeatureActivatedByLocalStorage(featureFlag)
  );
};

// Check if the feature is one of the default active features
const isDefaultActivatedFeature = (featureFlag: SupportedFeatureFlags): boolean => {
  return defaultActiveFeatures.includes(featureFlag);
};

// Check if feature includes in the url query, (url)?featureFlags=[featureName]
const isFeatureActivatedByUrl = (featureFlag: SupportedFeatureFlags): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  const featureParam = urlParams.get(featureFlagKey);
  if (featureParam) {
    const features = featureParam.split(',');
    return features.includes(featureFlag);
  }
  return false;
};

// Check if feature includes in local storage, featureFlags: ["featureName"]
const isFeatureActivatedByLocalStorage = (featureFlag: SupportedFeatureFlags): boolean => {
  const featureFlagsFromStorage = typedLocalStorage.getItem<string[]>(featureFlagKey) || [];
  return featureFlagsFromStorage.includes(featureFlag);
};
