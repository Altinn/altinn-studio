import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { FeatureFlag } from './FeatureFlag';
import { FeatureFlagsContextProvider } from './FeatureFlagsContext';
import type { FeatureFlagsContextValue } from './FeatureFlagsContext';
import React from 'react';
import { useFeatureFlag } from './useFeatureFlag';

// Test data:
const enabledFlag = FeatureFlag.Maskinporten;
const disabledFlag = FeatureFlag.ImageUpload;
const flags = [enabledFlag];
const contextValue: FeatureFlagsContextValue = { flags };

describe('useFeatureFlag', () => {
  describe('isEnabled', () => {
    it('Returns true when the flag is enabled', () => {
      const { result } = renderUseFeatureFlag(enabledFlag);
      expect(result.current).toBe(true);
    });

    it('Returns false when the flag is disabled', () => {
      const { result } = renderUseFeatureFlag(disabledFlag);
      expect(result.current).toBe(false);
    });
  });
});

function renderUseFeatureFlag(flag: FeatureFlag): RenderHookResult<boolean, never> {
  return renderHook<boolean, never>(() => useFeatureFlag(flag), {
    wrapper: ({ children }) => (
      <FeatureFlagsContextProvider value={contextValue}>{children}</FeatureFlagsContextProvider>
    ),
  });
}
