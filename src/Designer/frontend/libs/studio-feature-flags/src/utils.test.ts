import { typedLocalStorage } from '@studio/pure-functions';
import { FEATURE_FLAGS_KEY, retrieveFeatureFlags } from './utils';
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
});

function expectArrayInAnyOrder<T>(result: T[], expectedItems: T[]): void {
  expect(result).toEqual(expect.arrayContaining(expectedItems));
  expect(result).toHaveLength(expectedItems.length);
}
