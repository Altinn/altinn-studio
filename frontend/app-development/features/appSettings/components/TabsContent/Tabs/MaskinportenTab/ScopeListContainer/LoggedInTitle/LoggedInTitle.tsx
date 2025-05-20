import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioHeading } from '@studio/components';

export function LoggedInTitle(): ReactElement {
  const { t } = useTranslation();
  return (
    <StudioHeading level={3}>
      {t('app_settings.maskinporten_tab_available_scopes_title')}
    </StudioHeading>
  );
}
