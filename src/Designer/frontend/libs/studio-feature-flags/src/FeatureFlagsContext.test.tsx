import { FeatureFlag } from './FeatureFlag';
import { act, renderHook } from '@testing-library/react';
import { FeatureFlagsProvider, useFeatureFlagsContext } from './FeatureFlagsContext';
import React from 'react';
import { FEATURE_FLAGS_KEY } from './utils';
import { typedLocalStorage } from '@studio/pure-functions';

const testFlag1 = FeatureFlag.AddComponentModal;
const testFlag2 = FeatureFlag.ComponentConfigBeta;

describe('FeatureFlagsContext', () => {
  beforeEach(() => typedLocalStorage.removeItem(FEATURE_FLAGS_KEY));

  test('Flags given in the flags prop of the provider are used by default', () => {
    const { result } = renderHook(useFeatureFlagsContext, {
      wrapper: ({ children }) => (
        <FeatureFlagsProvider flags={[testFlag1, testFlag2]}>{children}</FeatureFlagsProvider>
      ),
    });
    expect(result.current.flags).toEqual([testFlag1, testFlag2]);
  });

  test('When no flags are set in the props, flags are read from local storage', () => {
    typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [testFlag1]);
    const { result } = renderHook(useFeatureFlagsContext, { wrapper: FeatureFlagsProvider });

    expect(result.current.flags).toEqual([testFlag1]);
    localStorage.removeItem(FEATURE_FLAGS_KEY);
  });

  test('Flags from local storage are initially ignored when the flags prop is set', () => {
    typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [testFlag1]);
    const { result } = renderHook(useFeatureFlagsContext, {
      wrapper: ({ children }) => (
        <FeatureFlagsProvider flags={[testFlag2]}>{children}</FeatureFlagsProvider>
      ),
    });
    expect(result.current.flags).toEqual([testFlag2]);
  });

  test('The addFlag function adds a flag to local storage and updates the context', async () => {
    const { result } = renderHook(useFeatureFlagsContext, { wrapper: FeatureFlagsProvider });
    await act(() => result.current.addFlag(testFlag1));

    expect(result.current.flags).toEqual([testFlag1]);
    expect(typedLocalStorage.getItem<FeatureFlag[]>(FEATURE_FLAGS_KEY)).toEqual([testFlag1]);
  });

  test('The removeFlag function removes a flag from local storage and updates the context', async () => {
    typedLocalStorage.setItem<FeatureFlag[]>(FEATURE_FLAGS_KEY, [testFlag1, testFlag2]);
    const { result } = renderHook(useFeatureFlagsContext, { wrapper: FeatureFlagsProvider });
    await act(() => result.current.removeFlag(testFlag1));

    expect(result.current.flags).toEqual([testFlag2]);
    expect(typedLocalStorage.getItem<FeatureFlag[]>(FEATURE_FLAGS_KEY)).toEqual([testFlag2]);
  });

  test('Error is thrown when the hook is used outside of the provider', () => {
    jest.spyOn(console, 'error').mockImplementation();
    expect(() => renderHook(useFeatureFlagsContext)).toThrow();
  });
});
