import type { FeatureFlag } from './FeatureFlag';
import { useFeatureFlagsContext } from './FeatureFlagsContext';

export type FeatureToggle = {
  isEnabled: boolean;
  toggle: (state: boolean) => void;
};

export function useFeatureToggle(flag: FeatureFlag): FeatureToggle {
  const { flags, addFlag, removeFlag } = useFeatureFlagsContext();
  return {
    isEnabled: flags.includes(flag),
    toggle: (state: boolean) => (state ? addFlag(flag) : removeFlag(flag)),
  };
}
