import { FeatureFlag } from './FeatureFlag';
import { renderHook } from '@testing-library/react';
import { FeatureFlagsProvider } from './FeatureFlagsProvider';
import { useFeatureFlagsContext } from './FeatureFlagsContext';
import { FEATURE_FLAGS_KEY } from './utils';
import { typedLocalStorage } from '@studio/pure-functions';

const testFlag = FeatureFlag.AddComponentModal;

describe('FeatureFlagsProvider', () => {
  const cleanup = (): void => typedLocalStorage.removeItem(FEATURE_FLAGS_KEY);
  beforeAll(cleanup);
  afterEach(cleanup);

  it('Reads flags from local storage', () => {
    typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [testFlag]);
    const { result } = renderHook(useFeatureFlagsContext, { wrapper: FeatureFlagsProvider });
    expect(result.current.flags).toEqual([testFlag]);
  });
});
