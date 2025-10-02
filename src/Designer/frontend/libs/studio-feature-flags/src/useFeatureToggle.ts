import type { FeatureFlag } from './FeatureFlag';
import { useFeatureFlagsContext } from './FeatureFlagsContext';
import { useFeatureFlagMutationContext } from './FeatureFlagMutationContext';

export type FeatureToggle = {
  isEnabled: boolean;
  toggle: (state: boolean) => void;
};

export function useFeatureToggle(flag: FeatureFlag): FeatureToggle {
  const { flags } = useFeatureFlagsContext();
  const { addFlag, removeFlag } = useFeatureFlagMutationContext();
  return {
    isEnabled: flags.includes(flag),
    toggle: (state: boolean) => (state ? addFlag(flag) : removeFlag(flag)),
  };
}
