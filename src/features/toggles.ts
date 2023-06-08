type FeatureToggle = 'doNotPromptForPartyPreference';
export type IFeatureToggles = { [key in FeatureToggle]?: boolean };

const featureToggles: IFeatureToggles = {
  doNotPromptForPartyPreference: window.featureToggles?.doNotPromptForPartyPreference ?? false,
};

window.featureToggles = featureToggles;
