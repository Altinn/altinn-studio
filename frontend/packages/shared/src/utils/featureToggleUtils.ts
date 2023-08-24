import { typedLocalStorage } from "app-shared/utils/webStorage";

const featureFlagKey = "featureFlags";

// All the features that you want to be toggle on/off should be added here. To ensure that we type check the feature name.
export type SupportedFeatureFlags =
  | "componentConfigBeta"
  | "expressions"
  | "policyEditor"
  | "processEditor";

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
export const shouldDisplayFeature = (
  featureFlag: SupportedFeatureFlags,
): boolean => {
  return (
    isDefaultActivatedFeature(featureFlag) ||
    isFeatureActivatedByUrl(featureFlag) ||
    isFeatureActivatedByLocalStorage(featureFlag)
  );
};

// Check if the feature is one of the default active features
const isDefaultActivatedFeature = (
  featureFlag: SupportedFeatureFlags,
): boolean => {
  return defaultActiveFeatures.includes(featureFlag);
};

// Check if feature includes in the url query, (url)?featureFlags=[featureName]
const isFeatureActivatedByUrl = (
  featureFlag: SupportedFeatureFlags,
): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  const featureParam = urlParams.get(featureFlagKey);
  if (featureParam) {
    const features = featureParam.split(",");
    return features.includes(featureFlag);
  }
  return false;
};

// Check if feature includes in local storage, featureFlags: ["featureName"]
const isFeatureActivatedByLocalStorage = (
  featureFlag: SupportedFeatureFlags,
): boolean => {
  const featureFlagsFromStorage =
    typedLocalStorage.getItem<string[]>(featureFlagKey) || [];
  return featureFlagsFromStorage.includes(featureFlag);
};

/**
 * @param featureFlag The feature flag to add to local storage
 * @description This function will add the feature flag to local storage
 * @example addFeatureToLocalStorage('myFeatureName')
 */
export const addFeatureToLocalStorage = (featureFlag: SupportedFeatureFlags) => {
  const featureFlagsFromStorage = typedLocalStorage.getItem<string[]>(featureFlagKey) || [];
  featureFlagsFromStorage.push(featureFlag);
  typedLocalStorage.setItem(featureFlagKey, featureFlagsFromStorage);
};

/**
 * @param featureFlag The feature flag to remove from local storage
 * @description This function will remove the feature flag from local storage
 * @example removeFeatureFromLocalStorage('myFeatureName')
 */
export const removeFeatureFromLocalStorage = (featureFlag: SupportedFeatureFlags) => {
  const featureFlagsFromStorage = typedLocalStorage.getItem<string[]>(featureFlagKey) || [];
  const filteredFeatureFlags = featureFlagsFromStorage.filter((feature) => feature !== featureFlag);
  typedLocalStorage.setItem(featureFlagKey, filteredFeatureFlags);
};
