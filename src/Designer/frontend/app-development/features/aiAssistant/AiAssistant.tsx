import type { ReactElement } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioCenter,
  StudioLink,
  StudioPageSpinner,
  StudioParagraph,
} from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FeatureName } from 'app-shared/enums/CanUseFeature';
import { useCanUseFeatureQuery } from '../../hooks/queries/useCanUseFeatureQuery';
import { AssistantWorkspace } from './components/AssistantWorkspace';

/**
 * During beta, access is restricted to selected service owners.
 * Allowlist is set by AiAssistantAccessService in the backend.
 */
function AiAssistant(): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data, isPending } = useCanUseFeatureQuery(org, app, FeatureName.AiAssistant);

  if (isPending) {
    return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
  }

  if (!data?.canUseFeature) {
    return (
      <StudioCenter>
        <StudioAlert>
          <StudioParagraph>
            <Trans
              i18nKey='ai_assistant.access_denied'
              components={{ a: <StudioLink href='/info/contact'> </StudioLink> }}
            />
          </StudioParagraph>
        </StudioAlert>
      </StudioCenter>
    );
  }

  return <AssistantWorkspace />;
}

export default AiAssistant;
