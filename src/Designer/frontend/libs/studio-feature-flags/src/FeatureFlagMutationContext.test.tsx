import { renderHook } from '@testing-library/react';
import React from 'react';
import {
  FeatureFlagMutationContextProvider,
  useFeatureFlagMutationContext,
} from './FeatureFlagMutationContext';
import type { FeatureFlagMutationContextValue } from './FeatureFlagMutationContext';

describe('FeatureFlagMutationContext', () => {
  test('Value given to the provider is exposed through the hook', () => {
    const value: FeatureFlagMutationContextValue = {
      addFlag() {},
      removeFlag() {},
    };
    const { result } = renderHook<FeatureFlagMutationContextValue, never>(
      useFeatureFlagMutationContext,
      {
        wrapper: ({ children }) => (
          <FeatureFlagMutationContextProvider value={value}>
            {children}
          </FeatureFlagMutationContextProvider>
        ),
      },
    );
    expect(result.current).toBe(value);
  });

  test('Error is thrown when the hook is used outside of the provider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    expect(() => renderHook(useFeatureFlagMutationContext)).toThrow();
    consoleErrorSpy.mockRestore();
  });
});
