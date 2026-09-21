import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useFeatureFlagsContext } from '@studio/feature-flags';
import { FeatureName } from 'app-shared/enums/CanUseFeature';
import { getRepositoryType } from 'app-shared/utils/repository';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { useIsRepoOwnerOrg } from 'app-development/hooks/useIsRepoOwnerOrg';
import { useCanUseFeatureQuery } from 'app-development/hooks/queries/useCanUseFeatureQuery';
import { topBarMenuItems } from 'app-development/utils/headerMenu';

export const useTopBarMenuItems = (): HeaderMenuItem[] => {
  const { org, app } = useStudioEnvironmentParams();
  const { flags } = useFeatureFlagsContext();
  const isRepoOwnerOrg = useIsRepoOwnerOrg();
  const { data: aiAssistantFeature } = useCanUseFeatureQuery(org, app, FeatureName.AiAssistant);

  const repositoryType = getRepositoryType(org, app);
  const allowedFeatures = aiAssistantFeature?.canUseFeature ? [FeatureName.AiAssistant] : [];

  return topBarMenuItems
    .filter((item) => item.repositoryTypes.includes(repositoryType))
    .filter((item) => !item.requiresOrgOwnedRepo || isRepoOwnerOrg)
    .filter((item) => !item.featureFlagName || flags.includes(item.featureFlagName))
    .filter((item) => !item.requiredFeature || allowedFeatures.includes(item.requiredFeature));
};
