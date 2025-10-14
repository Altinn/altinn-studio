import { typedLocalStorage } from '@studio/pure-functions';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  FEATURE_FLAGS_KEY,
  retrieveFeatureFlags,
} from './utils';
import { FeatureFlag } from './FeatureFlag';

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
});

function expectArrayInAnyOrder<T>(result: T[], expectedItems: T[]): void {
  expect(result).toEqual(expect.arrayContaining(expectedItems));
  expect(result).toHaveLength(expectedItems.length);
}
