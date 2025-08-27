import type { FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
} from 'app-shared/utils/featureToggleUtils';

export function setFeatureFlagInLocalStorage(flag: FeatureFlag, state: boolean): void {
  const changeInLocalStorage = retrieveChangeFunction(state);
  return changeInLocalStorage(flag);
}

function retrieveChangeFunction(state: boolean): (flag: FeatureFlag) => void {
  return state ? addFeatureFlagToLocalStorage : removeFeatureFlagFromLocalStorage;
}
