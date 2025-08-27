import { typedLocalStorage } from 'libs/studio-pure-functions/src'; // Todo: Move this to a more suitable place: https://github.com/Altinn/altinn-studio/issues/14230
import { setFeatureFlagInLocalStorage } from './setFeatureFlagInLocalStorage';
import type { FeatureFlag } from 'app-shared/utils/featureToggleUtils';

const testFlag = 'testFeature' as FeatureFlag; // Using casting here instead of a real flag because the list will change over time

describe('setFeatureFlagInLocalStorage', () => {
  beforeEach(() => typedLocalStorage.removeItem('featureFlags'));

  it('Adds the feature flag to the local storage when the state is true', () => {
    setFeatureFlagInLocalStorage(testFlag, true);
    expect(typedLocalStorage.getItem('featureFlags')).toEqual([testFlag]);
  });

  it('Removes the feature flag from the local storage when the state is false', () => {
    typedLocalStorage.setItem('featureFlags', [testFlag]);
    setFeatureFlagInLocalStorage(testFlag, false);
    expect(typedLocalStorage.getItem('featureFlags')).toEqual([]);
  });
});
