import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioHeading } from '@studio/components-legacy';

export const LoggedInTitle = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioHeading size='2xs' level={3} spacing>
      {t('settings_modal.maskinporten_tab_available_scopes_title')}
    </StudioHeading>
  );
};
