import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioPageSpinner } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FeatureName } from 'app-shared/enums/CanUseFeature';
import { useCanUseFeatureQuery } from '../../hooks/queries/useCanUseFeatureQuery';
import { AssistantAccessDenied } from './components/AssistantAccessDenied';
import { AssistantWorkspace } from './components/AssistantWorkspace';

/**
 * During beta, access is restricted to selected service owners, and the backend
 * decides — see AiAssistantAccessService.
 *
 * The workspace mounts only once access is confirmed, so a denied developer
 * never opens a session against the agents service.
 */
function AiAssistant(): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data, isPending } = useCanUseFeatureQuery(org, app, FeatureName.AiAssistant);

  if (isPending) {
    return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
  }

  if (!data?.canUseFeature) {
    return <AssistantAccessDenied />;
  }

  return <AssistantWorkspace />;
}

export default AiAssistant;
