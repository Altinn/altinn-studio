export const FeatureToggles = {
  doNotPromptForPartyPreference: {
    defaultValue: false,
    title: 'Spør om aktør hver gang',
    description:
      'Aktiver denne innstillingen for å alltid bli spurt om aktør når du starter en ny instans, med ' +
      'mindre du har valgt bort å bli spurt om aktør i Altinn-profilen. Frem til og med versjon 3 av app-frontend ' +
      'er standardinnstillingen at du ikke blir spurt om aktør - men fra versjon 4 vil alle brukere bli ' +
      'spurt om aktør hver gang med mindre de har deaktivert dette i profilen (med andre ord, app-frontend vil ' +
      'respektere denne innstillingen i profilen fra versjon 4).',
    links: [
      'https://github.com/Altinn/app-frontend-react/issues/268',
      'https://github.com/Altinn/app-frontend-react/pull/1204',
    ],
  },
};

export type FeatureToggleSource = 'window' | 'cookie' | 'default';
export type IFeatureToggles = keyof typeof FeatureToggles;
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

export const featureToggleValues: IFeatureTogglesMap = {
  doNotPromptForPartyPreference: getFeature('doNotPromptForPartyPreference').value,
};
