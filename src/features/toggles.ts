import type { IAltinnWindow } from 'src/types';

type FeatureToggle = 'doNotPromptForPartyPreference';
export type IFeatureToggles = { [key in FeatureToggle]?: boolean };

const altinnWindow = window as Window as IAltinnWindow;

const featureToggles: IFeatureToggles = {
  doNotPromptForPartyPreference: altinnWindow.featureToggles?.doNotPromptForPartyPreference ?? false,
};

altinnWindow.featureToggles = featureToggles;
