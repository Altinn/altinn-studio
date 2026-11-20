import type { FeatureFlag } from './FeatureFlag';
import { useFeatureFlagsContext } from './FeatureFlagsContext';
import { useFeatureFlagMutationContext } from './FeatureFlagMutationContext';
import { useCallback, useMemo } from 'react';

export type FeatureToggle = {
  isEnabled: boolean;
  toggle: (state: boolean) => void;
};

export function useFeatureToggle(flag: FeatureFlag): FeatureToggle {
  const { flags } = useFeatureFlagsContext();
  const { addFlag, removeFlag } = useFeatureFlagMutationContext();

  const toggle = useCallback(
    (state: boolean) => (state ? addFlag(flag) : removeFlag(flag)),
    [addFlag, removeFlag, flag],
  );

  return useMemo(() => ({ isEnabled: flags.includes(flag), toggle }), [flags, flag, toggle]);
}
