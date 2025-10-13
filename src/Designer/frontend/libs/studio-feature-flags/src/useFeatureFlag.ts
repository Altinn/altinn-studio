import type { FeatureFlag } from './FeatureFlag';
import { useFeatureFlagsContext } from './FeatureFlagsContext';

export function useFeatureFlag(flag: FeatureFlag): boolean {
  const { flags } = useFeatureFlagsContext();
  return flags.includes(flag);
}
