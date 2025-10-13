import { FeatureFlag } from './FeatureFlag';
import type { RenderHookResult } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import { FeatureFlagsProvider } from './FeatureFlagsProvider';
import type { FeatureFlagsContextValue } from './FeatureFlagsContext';
import { useFeatureFlagsContext } from './FeatureFlagsContext';
import { FEATURE_FLAGS_KEY } from './utils';
import { typedLocalStorage } from '@studio/pure-functions';
import type { FeatureFlagMutationContextValue } from './FeatureFlagMutationContext';
import { useFeatureFlagMutationContext } from './FeatureFlagMutationContext';

const testFlag1 = FeatureFlag.AddComponentModal;
const testFlag2 = FeatureFlag.ComponentConfigBeta;

describe('FeatureFlagsProvider', () => {
  const cleanup = (): void => typedLocalStorage.removeItem(FEATURE_FLAGS_KEY);
  beforeAll(cleanup);
  afterEach(cleanup);

  it('Reads flags from local storage', () => {
    typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [testFlag1]);
    const { result } = renderHook(useFeatureFlagsContext, { wrapper: FeatureFlagsProvider });
    expect(result.current.flags).toEqual([testFlag1]);
  });

  test('The addFlag function adds a flag to local storage and updates the context', () => {
    const { result } = renderHooks();
    act(() => result.current.addFlag(testFlag1));

    expect(result.current.flags).toEqual([testFlag1]);
    expect(typedLocalStorage.getItem<FeatureFlag[]>(FEATURE_FLAGS_KEY)).toEqual([testFlag1]);
  });

  test('The removeFlag function removes a flag from local storage and updates the context', () => {
    typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [testFlag1, testFlag2]);
    const { result } = renderHooks();
    act(() => result.current.removeFlag(testFlag1));

    expect(result.current.flags).toEqual([testFlag2]);
    expect(typedLocalStorage.getItem<FeatureFlag[]>(FEATURE_FLAGS_KEY)).toEqual([testFlag2]);
  });
});

type HooksResult = FeatureFlagsContextValue & FeatureFlagMutationContextValue;

function renderHooks(): RenderHookResult<HooksResult, never> {
  return renderHook(
    () => ({
      ...useFeatureFlagsContext(),
      ...useFeatureFlagMutationContext(),
    }),
    { wrapper: FeatureFlagsProvider },
  );
}
