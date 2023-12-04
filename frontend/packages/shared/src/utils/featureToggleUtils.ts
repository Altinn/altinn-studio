import { typedLocalStorage, typedSessionStorage } from 'app-shared/utils/webStorage';

const featureFlagKey = 'featureFlags';
const persistFeatureKey = 'persistFeatureFlag';

// All the features that you want to be toggle on/off should be added here. To ensure that we type check the feature name.
export type SupportedFeatureFlags =
  | 'componentConfigBeta'
  | 'expressions'
  | 'processEditor'
  | 'configureLayoutSet'
  | 'newAdministration'
  | 'formTree'
  | 'shouldOverrideAppLibCheck';

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
 * @example shouldDisplayFeature('myFeatureName') && <MyFeatureComponent />
 * @example The feature can be toggled and persisted by the url query, (url)?featureFlags=[featureName]&persistFeatureFlag=true
 */
export const shouldDisplayFeature = (featureFlag: SupportedFeatureFlags): boolean => {
  // Check if feature should be persisted in session storage, (url)?persistFeatureFlag=true
  if (shouldPersistInSession()) {
    addFeatureFlagToSessionStorage(featureFlag);
  }

  return (
    isDefaultActivatedFeature(featureFlag) ||
    isFeatureActivatedByUrl(featureFlag) ||
    isFeatureActivatedBySessionStorage(featureFlag) ||
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

/**
 * @param featureFlag The feature flag to add to local storage
 * @description This function will add the feature flag to local storage
 * @example addFeatureToLocalStorage('myFeatureName')
 */
export const addFeatureFlagToLocalStorage = (featureFlag: SupportedFeatureFlags): void => {
  const featureFlagsFromStorage = typedLocalStorage.getItem<string[]>(featureFlagKey) || [];
  featureFlagsFromStorage.push(featureFlag);
  typedLocalStorage.setItem(featureFlagKey, featureFlagsFromStorage);
};

/**
 * @param featureFlag The feature flag to remove from local storage
 * @description This function will remove the feature flag from local storage
 * @example removeFeatureFromLocalStorage('myFeatureName')
 */
export const removeFeatureFlagFromLocalStorage = (featureFlag: SupportedFeatureFlags): void => {
  const featureFlagsFromStorage = typedLocalStorage.getItem<string[]>(featureFlagKey) || [];
  const filteredFeatureFlags = featureFlagsFromStorage.filter((feature) => feature !== featureFlag);
  typedLocalStorage.setItem(featureFlagKey, filteredFeatureFlags);
};

// Check if feature includes in session storage, featureFlags: ["featureName"]
const isFeatureActivatedBySessionStorage = (featureFlag: SupportedFeatureFlags): boolean => {
  const featureFlagsFromStorage = typedSessionStorage.getItem<string[]>(featureFlagKey) || [];
  return featureFlagsFromStorage.includes(featureFlag);
};

// Check if the feature should be persisted in session storage, (url)?persistFeatureFlag=true
const shouldPersistInSession = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  const shouldPersistInSession = urlParams.get(persistFeatureKey);
  return !!shouldPersistInSession;
};

// Add feature to session storage to persist the feature in the current session
const addFeatureFlagToSessionStorage = (featureFlag: SupportedFeatureFlags): void => {
  const featureFlagsFromStorage = typedSessionStorage.getItem<string[]>(featureFlagKey) || [];

  const featureFlagAlreadyExist = featureFlagsFromStorage.includes(featureFlag);
  if (featureFlagAlreadyExist) return;
  typedSessionStorage.setItem<string[]>(featureFlagKey, [...featureFlagsFromStorage, featureFlag]);
};
