/* IFeatureToggles = string is a placeholder for an empty type. Replace string with a union type of new feature-toggles. Ex. 'feature1' | 'feature2' */
export type IFeatureToggles = string;
export type IFeatureToggleConf = {
  [feature in IFeatureToggles]: {
    defaultValue: boolean;
    title: string;
    description: string;
    links: string[];
  };
};

export const FeatureToggles: IFeatureToggleConf = {};

export type FeatureToggleSource = 'window' | 'cookie' | 'default';
export type IFeatureTogglesOptionalMap = { [key in IFeatureToggles]?: boolean };
export type IFeatureTogglesMap = { [key in IFeatureToggles]: boolean };
export type FeatureValue = { value: boolean; source: FeatureToggleSource };
export type AugmentedFeatureToggles = {
  [key in IFeatureToggles]: (typeof FeatureToggles)[key] & FeatureValue & { key: IFeatureToggles };
};

export function getFeature(feature: IFeatureToggles): FeatureValue {
  if (
    window.featureToggles &&
    feature in window.featureToggles &&
    typeof window.featureToggles[feature] === 'boolean'
  ) {
    return {
      value: window.featureToggles[feature] as boolean,
      source: 'window',
    };
  }

  if (document.cookie.includes(`FEATURE_${feature}=true`)) {
    return { value: true, source: 'cookie' };
  }

  if (document.cookie.includes(`FEATURE_${feature}=false`)) {
    return { value: false, source: 'cookie' };
  }

  return { value: FeatureToggles[feature].defaultValue, source: 'default' };
}

export function getAugmentedFeatures(): AugmentedFeatureToggles {
  const augmentedFeatures: AugmentedFeatureToggles = {} as AugmentedFeatureToggles;
  for (const feature of Object.keys(FeatureToggles) as IFeatureToggles[]) {
    augmentedFeatures[feature] = {
      ...FeatureToggles[feature],
      ...getFeature(feature),
      key: feature,
    };
  }

  return augmentedFeatures;
}

export const featureToggleValues: IFeatureTogglesMap = {};
