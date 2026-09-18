import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioCenter, StudioAlert, StudioParagraph } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';

export function AssistantAccessDenied(): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const textKey = repository?.fork
    ? 'ai_assistant.access_denied_fork'
    : 'ai_assistant.access_denied';

  return (
    <StudioCenter>
      <StudioAlert>
        <StudioParagraph>{t(textKey)}</StudioParagraph>
      </StudioAlert>
    </StudioCenter>
  );
}
