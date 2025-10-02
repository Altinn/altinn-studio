import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { FeatureFlag } from './FeatureFlag';
import { FeatureFlagsProvider } from './FeatureFlagsContext';
import React from 'react';
import { useFeatureFlag } from './useFeatureFlag';

const flagToTest1 = FeatureFlag.Maskinporten;
const flagToTest2 = FeatureFlag.ImageUpload;

describe('useFeatureFlag', () => {
  describe('isEnabled', () => {
    it('Returns true when the flag is enabled', () => {
      const { result } = renderUseFeatureFlag([flagToTest1, flagToTest2], flagToTest1);
      expect(result.current).toBe(true);
    });

    it('Returns false when the flag is disabled', () => {
      const { result } = renderUseFeatureFlag([flagToTest2], flagToTest1);
      expect(result.current).toBe(false);
    });
  });
});

function renderUseFeatureFlag(
  initialFlags: FeatureFlag[],
  flag: FeatureFlag,
): RenderHookResult<boolean, never> {
  return renderHook<boolean, never>(() => useFeatureFlag(flag), {
    wrapper: ({ children }) => (
      <FeatureFlagsProvider flags={initialFlags}>{children}</FeatureFlagsProvider>
    ),
  });
}
