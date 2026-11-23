import { FeatureFlag, useFeatureFlag } from '@designer/feature-flags';
import { useAppMetadataQuery, useAppVersionQuery } from 'app-shared/hooks/queries';
import { isAppBuilderSupported } from './appBuilderAvailability';

export type AppBuilderAvailability = {
  isPending: boolean;
  isAvailable: boolean;
};

/**
 * Whether the builder is available for the app: the feature flag is on, and the app is one the
 * builder supports. Both queries are already loaded by the page header, so this adds no requests.
 */
export function useAppBuilderAvailability(org: string, app: string): AppBuilderAvailability {
  const isFlagOn = useFeatureFlag(FeatureFlag.AppBuilder);
  const { data: version, isPending: isVersionPending } = useAppVersionQuery(org, app);
  const { data: metadata, isPending: isMetadataPending } = useAppMetadataQuery(org, app);

  if (!isFlagOn) return { isPending: false, isAvailable: false };
  if (isVersionPending || isMetadataPending) return { isPending: true, isAvailable: false };
  return { isPending: false, isAvailable: isAppBuilderSupported(version, metadata) };
}
