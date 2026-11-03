import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { typedLocalStorage } from '@studio/pure-functions';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  EXPERIMENTAL_FEATURES_MODE_KEY,
  FEATURE_FLAGS_KEY,
  retrieveExperimentalFeaturesMode,
  retrieveFeatureFlags,
  setExperimentalFeaturesModeInLocalStorage,
  turnOffFeatureFlag,
} from './utils';
import { FeatureFlag, experimentalFeatureFlags } from './FeatureFlag';

describe('studio-feature-flags utils', () => {
  const primaryFeatureToTest = FeatureFlag.ShouldOverrideAppLibCheck;
  const secondaryFeatureToTest = FeatureFlag.AddComponentModal;
  const tertiaryFeatureToTest = FeatureFlag.ComponentConfigBeta;

  const cleanup = (): void => {
    typedLocalStorage.removeItem(FEATURE_FLAGS_KEY);
    window.history.pushState({}, 'PageUrl', '/');
  };
  beforeAll(cleanup);
  afterEach(cleanup);

  describe('retrieveFeatureFlags', () => {
    it('Returns a list of all feature flags both from the local storage and from the URL', () => {
      typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [
        primaryFeatureToTest,
        secondaryFeatureToTest,
      ]);
      window.history.pushState(
        {},
        'PageUrl',
        `/?${FEATURE_FLAGS_KEY}=${secondaryFeatureToTest},${tertiaryFeatureToTest}`,
      );
      const expectedFlags = [primaryFeatureToTest, secondaryFeatureToTest, tertiaryFeatureToTest];
      expectArrayInAnyOrder(retrieveFeatureFlags(), expectedFlags);
    });

    it('Returns an empty array when no flags are set', () => {
      expect(retrieveFeatureFlags()).toEqual([]);
    });

    it('Returns URL flags only when the storage item is not parsable', () => {
      typedLocalStorage.setItem<number>(FEATURE_FLAGS_KEY, 1);
      window.history.pushState({}, 'PageUrl', `/?${FEATURE_FLAGS_KEY}=${primaryFeatureToTest}`);
      expect(retrieveFeatureFlags()).toEqual([primaryFeatureToTest]);
    });
  });

  describe('addFeatureToLocalStorage', () => {
    beforeEach(() => typedLocalStorage.removeItem(FEATURE_FLAGS_KEY));

    it('Adds the given feature to the local storage', () => {
      addFeatureFlagToLocalStorage(primaryFeatureToTest);
      expect(typedLocalStorage.getItem<FeatureFlag[]>(FEATURE_FLAGS_KEY)).toEqual([
        primaryFeatureToTest,
      ]);
    });

    it('Append provided feature to existing features in local storage', () => {
      typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [secondaryFeatureToTest]);
      addFeatureFlagToLocalStorage(primaryFeatureToTest);
      expect(typedLocalStorage.getItem<FeatureFlag[]>(FEATURE_FLAGS_KEY)).toEqual([
        secondaryFeatureToTest,
        primaryFeatureToTest,
      ]);
    });
  });

  describe('removeFeatureFromLocalStorage', () => {
    beforeEach(() => typedLocalStorage.removeItem(FEATURE_FLAGS_KEY));

    it('Remove feature from local storage', () => {
      typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [primaryFeatureToTest]);
      removeFeatureFlagFromLocalStorage(primaryFeatureToTest);
      expect(typedLocalStorage.getItem<FeatureFlag[]>(FEATURE_FLAGS_KEY)).toEqual([]);
    });

    it('Removes only the specified feature from local storage', () => {
      typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [
        primaryFeatureToTest,
        secondaryFeatureToTest,
      ]);
      removeFeatureFlagFromLocalStorage(primaryFeatureToTest);
      expect(typedLocalStorage.getItem<FeatureFlag[]>(FEATURE_FLAGS_KEY)).toEqual([
        secondaryFeatureToTest,
      ]);
    });

    it('Injects an empty array to the local storage item when no feature flags are set', () => {
      removeFeatureFlagFromLocalStorage(primaryFeatureToTest);
      expect(typedLocalStorage.getItem<FeatureFlag[]>(FEATURE_FLAGS_KEY)).toEqual([]);
    });
  });

  describe('Experimental features mode', () => {
    const [experimentalFlag, ...otherExperimentalFlags] = experimentalFeatureFlags;
    const developerFlag = FeatureFlag.ShouldOverrideAppLibCheck;

    beforeEach(() => typedLocalStorage.removeItem(EXPERIMENTAL_FEATURES_MODE_KEY));
    afterEach(() => typedLocalStorage.removeItem(EXPERIMENTAL_FEATURES_MODE_KEY));

    it('Returns the custom mode when no mode is stored', () => {
      expect(retrieveExperimentalFeaturesMode()).toBe('custom');
    });

    it('Returns the custom mode when the stored mode is not valid', () => {
      typedLocalStorage.setItem<string>(EXPERIMENTAL_FEATURES_MODE_KEY, 'invalid');
      expect(retrieveExperimentalFeaturesMode()).toBe('custom');
    });

    it('Stores the given mode', () => {
      setExperimentalFeaturesModeInLocalStorage('all');
      expect(retrieveExperimentalFeaturesMode()).toBe('all');
    });

    it('Returns every experimental flag in the all mode, but no developer flag', () => {
      setExperimentalFeaturesModeInLocalStorage('all');
      expectArrayInAnyOrder(retrieveFeatureFlags(), [...experimentalFeatureFlags]);
      expect(retrieveFeatureFlags()).not.toContain(developerFlag);
    });

    it('Turns a flag off by removing it from the storage in the custom mode', () => {
      typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [experimentalFlag]);
      turnOffFeatureFlag(experimentalFlag);
      expect(retrieveFeatureFlags()).toEqual([]);
    });

    it('Changes to the custom mode with the other experimental flags on when an experimental flag is turned off in the all mode', () => {
      typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [developerFlag]);
      setExperimentalFeaturesModeInLocalStorage('all');
      turnOffFeatureFlag(experimentalFlag);
      expect(retrieveExperimentalFeaturesMode()).toBe('custom');
      expectArrayInAnyOrder(retrieveFeatureFlags(), [developerFlag, ...otherExperimentalFlags]);
    });

    it('Keeps the all mode when a developer flag is turned off in the all mode', () => {
      typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [developerFlag]);
      setExperimentalFeaturesModeInLocalStorage('all');
      turnOffFeatureFlag(developerFlag);
      expect(retrieveExperimentalFeaturesMode()).toBe('all');
      expect(retrieveFeatureFlags()).not.toContain(developerFlag);
    });
  });
});

function expectArrayInAnyOrder<T>(result: T[], expectedItems: T[]): void {
  expect(result).toEqual(expect.arrayContaining<unknown>(expectedItems));
  expect(result).toHaveLength(expectedItems.length);
}
