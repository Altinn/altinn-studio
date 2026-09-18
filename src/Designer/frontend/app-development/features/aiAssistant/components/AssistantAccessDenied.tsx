import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioCenter, StudioAlert, StudioParagraph } from '@studio/components';

export function AssistantAccessDenied(): ReactElement {
  const { t } = useTranslation();

  return (
    <StudioCenter>
      <StudioAlert>
        <StudioParagraph>{t('ai_assistant.access_denied')}</StudioParagraph>
      </StudioAlert>
    </StudioCenter>
  );
}
