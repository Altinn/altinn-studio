import { FeatureFlag } from './FeatureFlag';
import { renderHook } from '@testing-library/react';
import { FeatureFlagsContextProvider, useFeatureFlagsContext } from './FeatureFlagsContext';
import type { FeatureFlagsContextValue } from './FeatureFlagsContext';
import React from 'react';

const testFlag1 = FeatureFlag.AddComponentModal;
const testFlag2 = FeatureFlag.ComponentConfigBeta;

describe('FeatureFlagsContext', () => {
  test('Value given to the provider is exposed through the hook', () => {
    const value: FeatureFlagsContextValue = { flags: [testFlag1, testFlag2] };
    const { result } = renderHook(useFeatureFlagsContext, {
      wrapper: ({ children }) => (
        <FeatureFlagsContextProvider value={value}>{children}</FeatureFlagsContextProvider>
      ),
    });
    expect(result.current).toBe(value);
  });

  test('Error is thrown when the hook is used outside of the provider', () => {
    jest.spyOn(console, 'error').mockImplementation();
    expect(() => renderHook(useFeatureFlagsContext)).toThrow();
  });
});
