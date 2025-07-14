export const FeatureToggles = {
  betaPDFenabled: {
    defaultValue: false,
    title: 'Activate beta pdf rendering using Summary2',
    description: '',
    links: ['https://github.com/Altinn/app-frontend-react/issues/1502'],
  },
  simpleTableEnabled: {
    defaultValue: false,
    title: 'Activate experimental component SimpleTable',
    description: '',
    links: ['https://github.com/Altinn/app-frontend-react/pull/2593'],
  },
  addToListEnabled: {
    defaultValue: false,
    title: 'Activate experimental component AddToList',
    description: '',
    links: ['https://github.com/Altinn/app-frontend-react/pull/2745'],
  },
  saveOnBlur: {
    defaultValue: true,
    title: 'Rush to save form data when leaving/unfocusing an input field',
    description:
      "This is on by default, but can be disabled if you want less network traffic and don't need to run backend dynamics immediately when leaving an input field.",
  },
};

export type FeatureToggleSource = 'window' | 'cookie' | 'default';
export type IFeatureToggles = keyof typeof FeatureToggles;
export type IFeatureTogglesOptionalMap = { [key in IFeatureToggles]?: boolean };
export type FeatureValue = { value: boolean; source: FeatureToggleSource };

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
