import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';

export const FeatureToggles = {
  betaPDFenabled: {
    defaultValue: true,
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
  addInstanceIdentifierToLayoutRequests: {
    defaultValue: false,
    title: 'Fetch instance specific layouts',
    description: 'This is required when using instance specific layouts',
  },
};

export type FeatureToggleSource = 'window' | 'cookie' | 'default' | 'applicationMetadata';
export type IFeatureToggles = keyof typeof FeatureToggles;
export type IFeatureTogglesOptionalMap = { [key in IFeatureToggles]?: boolean };
export type FeatureValue = { value: boolean; source: FeatureToggleSource };

export function getFeature(feature: IFeatureToggles, applicationMetaData: ApplicationMetadata): FeatureValue {
  if (
    applicationMetaData.features &&
    feature in applicationMetaData.features &&
    typeof applicationMetaData.features[feature] === 'boolean'
  ) {
    return {
      value: applicationMetaData.features[feature] as boolean,
      source: 'applicationMetadata',
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
