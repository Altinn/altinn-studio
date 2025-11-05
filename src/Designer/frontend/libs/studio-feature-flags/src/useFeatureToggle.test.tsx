import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { FeatureToggle } from './useFeatureToggle';
import { useFeatureToggle } from './useFeatureToggle';
import { FeatureFlag } from './FeatureFlag';
import { FeatureFlagsContextProvider } from './FeatureFlagsContext';
import React from 'react';
import { FeatureFlagMutationContextProvider } from './FeatureFlagMutationContext';

// Test data:
const enabledFlag = FeatureFlag.Maskinporten;
const disabledFlag = FeatureFlag.NewCodeLists;
const flags = [enabledFlag];
const addFlag = jest.fn();
const removeFlag = jest.fn();

describe('useFeatureToggle', () => {
  beforeEach(jest.clearAllMocks);

  describe('isEnabled', () => {
    it('Returns true when the given feature is enabled', () => {
      const { result } = renderUseFeatureToggle(enabledFlag);
      expect(result.current.isEnabled).toBe(true);
    });

    it('Returns false when the given feature is not enabled', () => {
      const { result } = renderUseFeatureToggle(disabledFlag);
      expect(result.current.isEnabled).toBe(false);
    });
  });

  describe('toggle', () => {
    it('Enables the feature when called with true', () => {
      const { result } = renderUseFeatureToggle(disabledFlag);
      result.current.toggle(true);
      expect(addFlag).toHaveBeenCalledTimes(1);
      expect(addFlag).toHaveBeenCalledWith(disabledFlag);
      expect(removeFlag).not.toHaveBeenCalled();
    });

    it('Disables the feature when called with false', () => {
      const { result } = renderUseFeatureToggle(enabledFlag);
      result.current.toggle(false);
      expect(removeFlag).toHaveBeenCalledTimes(1);
      expect(removeFlag).toHaveBeenCalledWith(enabledFlag);
      expect(addFlag).not.toHaveBeenCalled();
    });
  });
});

function renderUseFeatureToggle(flag: FeatureFlag): RenderHookResult<FeatureToggle, never> {
  return renderHook<FeatureToggle, never>(() => useFeatureToggle(flag), {
    wrapper: ({ children }) => (
      <FeatureFlagMutationContextProvider value={{ addFlag, removeFlag }}>
        <FeatureFlagsContextProvider value={{ flags }}>{children}</FeatureFlagsContextProvider>
      </FeatureFlagMutationContextProvider>
    ),
  });
}
