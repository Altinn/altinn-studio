import type { RenderHookResult } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import type { FeatureToggle } from './useFeatureToggle';
import { useFeatureToggle } from './useFeatureToggle';
import { FeatureFlag } from './FeatureFlag';
import { FeatureFlagsProvider } from './FeatureFlagsContext';
import React from 'react';
import { typedLocalStorage } from '@studio/pure-functions';
import { FEATURE_FLAGS_KEY } from './utils';

const flagToTest1 = FeatureFlag.Maskinporten;
const flagToTest2 = FeatureFlag.ImageUpload;

describe('useFeatureToggle', () => {
  describe('isEnabled', () => {
    it('Returns true when the given feature is enabled', () => {
      const activeFlags = [flagToTest1, flagToTest2];
      const { result } = renderUseFeatureToggle(activeFlags, flagToTest1);
      expect(result.current.isEnabled).toBe(true);
    });

    it('Returns false when the given feature is not enabled', () => {
      const activeFlags = [flagToTest2];
      const { result } = renderUseFeatureToggle(activeFlags, flagToTest1);
      expect(result.current.isEnabled).toBe(false);
    });
  });

  describe('toggle', () => {
    beforeEach(() => typedLocalStorage.removeItem(FEATURE_FLAGS_KEY));

    it('Enables the feature when called with true', () => {
      const activeFlags = [flagToTest2];
      const { result } = renderUseFeatureToggle(activeFlags, flagToTest1);
      act(() => result.current.toggle(true));
      expect(result.current.isEnabled).toBe(true);
    });

    it('Disables the feature when called with false', () => {
      const activeFlags = [flagToTest1, flagToTest2];
      const { result } = renderUseFeatureToggle(activeFlags, flagToTest1);
      act(() => result.current.toggle(false));
      expect(result.current.isEnabled).toBe(false);
    });
  });
});

function renderUseFeatureToggle(
  initialFlags: FeatureFlag[],
  flag: FeatureFlag,
): RenderHookResult<FeatureToggle, never> {
  return renderHook<FeatureToggle, never>(() => useFeatureToggle(flag), {
    wrapper: ({ children }) => (
      <FeatureFlagsProvider flags={initialFlags}>{children}</FeatureFlagsProvider>
    ),
  });
}
