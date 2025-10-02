import { typedLocalStorage, typedSessionStorage } from '@studio/pure-functions';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  shouldDisplayFeature,
  FEATURE_FLAGS_KEY,
  retrieveFeatureFlags,
} from './utils';
import { FeatureFlag } from './FeatureFlag';

describe('studio-feature-flags utils', () => {
  const primaryFeatureToTest = FeatureFlag.ShouldOverrideAppLibCheck;
  const secondaryFeatureToTest = FeatureFlag.AddComponentModal;
  const tertiaryFeatureToTest = FeatureFlag.ComponentConfigBeta;

  describe('shouldDisplayFeature', () => {
    describe('Reading from local storage', () => {
      beforeEach(() => typedLocalStorage.removeItem(FEATURE_FLAGS_KEY));

      it('Returns true when the given feature is enabled in the local storage', () => {
        typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [primaryFeatureToTest]);
        expect(shouldDisplayFeature(primaryFeatureToTest)).toBe(true);
      });

      it('Returns true when the given feature flag is one of several flags that are enabled in the local storage', () => {
        typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [
          secondaryFeatureToTest,
          primaryFeatureToTest,
        ]);
        expect(shouldDisplayFeature(primaryFeatureToTest)).toBe(true);
      });

      it('Returns false when the given feature is not enabled in the local storage', () => {
        typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [secondaryFeatureToTest]);
        expect(shouldDisplayFeature(primaryFeatureToTest)).toBe(false);
      });

      it('Returns false when no features are enabled in the local storage', () => {
        expect(shouldDisplayFeature(primaryFeatureToTest)).toBe(false);
      });
    });

    describe('Reading from URL', () => {
      beforeEach(() => {
        typedLocalStorage.removeItem(FEATURE_FLAGS_KEY);
        typedSessionStorage.removeItem(FEATURE_FLAGS_KEY);
      });

      it('Returns true when the given feature is enabled in the url', () => {
        window.history.pushState({}, 'PageUrl', `/?${FEATURE_FLAGS_KEY}=${primaryFeatureToTest}`);
        expect(shouldDisplayFeature(primaryFeatureToTest)).toBe(true);
      });

      it('Returns true when the given feature is one of several that are enabled in the URL', () => {
        window.history.pushState(
          {},
          'PageUrl',
          `/?${FEATURE_FLAGS_KEY}=${secondaryFeatureToTest},${primaryFeatureToTest}`,
        );
        expect(shouldDisplayFeature(primaryFeatureToTest)).toBe(true);
      });

      it('Returns false when the given feature is not included in the URL', () => {
        window.history.pushState({}, 'PageUrl', `/?${FEATURE_FLAGS_KEY}=${secondaryFeatureToTest}`);
        expect(shouldDisplayFeature(primaryFeatureToTest)).toBe(false);
      });

      it('Returns false when no feature is enabled by the URL', () => {
        window.history.pushState({}, 'PageUrl', '/');
        expect(shouldDisplayFeature(primaryFeatureToTest)).toBeFalsy();
      });
    });
  });

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
      typedLocalStorage.removeItem(FEATURE_FLAGS_KEY);
      window.history.pushState({}, 'PageUrl', '/');
      expect(retrieveFeatureFlags()).toEqual([]);
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
  });
});

function expectArrayInAnyOrder<T>(result, expectedItems): void {
  expect(result).toEqual(expect.arrayContaining(expectedItems));
  expect(result).toHaveLength(expectedItems.length);
}
