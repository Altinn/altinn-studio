import { typedLocalStorage, typedSessionStorage } from '@studio/pure-functions';

const featureFlagKey = 'featureFlags';
const persistFeatureKey = 'persistFeatureFlag';

/**
 * @deprecated Use FeatureFlag from @studio/feature-flags instead.
 */
export enum FeatureFlag {
  AddComponentModal = 'addComponentModal',
  ComponentConfigBeta = 'componentConfigBeta',
  Maskinporten = 'maskinporten',
  ShouldOverrideAppLibCheck = 'shouldOverrideAppLibCheck',
  AppMetadata = 'appMetadata',
  ImageUpload = 'imageUpload',
  HideGiteaFieldsInResourceList = 'hideGiteaFieldsInResourceList',
}

/*
 * Please add all the features that you want to be toggle on by default here.
 * Remember that all the features that are listed here will be available to the users in production,
 * since this is the default active features.
 */
const defaultActiveFeatures: FeatureFlag[] = [];

/**
 * @param featureFlag
 * @returns boolean
 * @description This function will check if the feature should be displayed or not. The feature can be toggled on by the url query, by local storage or set as default active feature.
 * @example shouldDisplayFeature('myFeatureName') && <MyFeatureComponent />
 * @example The feature can be toggled and persisted by the url query, (url)?featureFlags=[featureName]&persistFeatureFlag=true
 */
export const shouldDisplayFeature = (featureFlag: FeatureFlag): boolean => {
  // Check if feature should be persisted in session storage, (url)?persistFeatureFlag=true
  if (shouldPersistInSession() && isFeatureActivatedByUrl(featureFlag)) {
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
const isDefaultActivatedFeature = (featureFlag: FeatureFlag): boolean => {
  return defaultActiveFeatures.includes(featureFlag);
};

// Check if feature includes in the url query, (url)?featureFlags=[featureName]
const isFeatureActivatedByUrl = (featureFlag: FeatureFlag): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  const featureParam = urlParams.get(featureFlagKey);

  if (featureParam) {
    const features = featureParam.split(',');
    return features.includes(featureFlag);
  }

  return false;
};

// Check if feature includes in local storage, featureFlags: ["featureName"]
export const isFeatureActivatedByLocalStorage = (featureFlag: FeatureFlag): boolean => {
  const featureFlagsFromStorage = typedLocalStorage.getItem<string[]>(featureFlagKey) || [];
  return featureFlagsFromStorage.includes(featureFlag);
};

/**
 * @param featureFlag The feature flag to add to local storage
 * @description This function will add the feature flag to local storage
 * @example addFeatureToLocalStorage('myFeatureName')
 */
export const addFeatureFlagToLocalStorage = (featureFlag: FeatureFlag): void => {
  const featureFlagsFromStorage = typedLocalStorage.getItem<string[]>(featureFlagKey) || [];
  featureFlagsFromStorage.push(featureFlag);
  typedLocalStorage.setItem(featureFlagKey, featureFlagsFromStorage);
};

/**
 * @param featureFlag The feature flag to remove from local storage
 * @description This function will remove the feature flag from local storage
 * @example removeFeatureFromLocalStorage('myFeatureName')
 */
export const removeFeatureFlagFromLocalStorage = (featureFlag: FeatureFlag): void => {
  const featureFlagsFromStorage = typedLocalStorage.getItem<string[]>(featureFlagKey) || [];
  const filteredFeatureFlags = featureFlagsFromStorage.filter((feature) => feature !== featureFlag);
  typedLocalStorage.setItem(featureFlagKey, filteredFeatureFlags);
};

// Check if feature includes in session storage, featureFlags: ["featureName"]
const isFeatureActivatedBySessionStorage = (featureFlag: FeatureFlag): boolean => {
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
const addFeatureFlagToSessionStorage = (featureFlag: FeatureFlag): void => {
  const featureFlagsFromStorage = typedSessionStorage.getItem<string[]>(featureFlagKey) || [];

  const featureFlagAlreadyExist = featureFlagsFromStorage.includes(featureFlag);
  if (featureFlagAlreadyExist) return;
  typedSessionStorage.setItem<string[]>(featureFlagKey, [...featureFlagsFromStorage, featureFlag]);
};
