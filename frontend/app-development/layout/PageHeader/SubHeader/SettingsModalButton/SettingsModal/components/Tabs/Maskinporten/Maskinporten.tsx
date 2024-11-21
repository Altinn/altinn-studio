import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { TabContent } from '../../TabContent';
import { StudioButton, StudioHeading, StudioParagraph, StudioSpinner } from '@studio/components';
import { useIsLoggedInWithAnsattportenQuery } from '../../../../../../../../hooks/queries/useIsLoggedInWithAnsattportenQuery';
import { loginWithAnsattPorten } from 'app-shared/api/paths';

export const Maskinporten = (): ReactElement => {
  const { data: ansattportenAuthStatus, isPending: isPendingAuthStatus } =
    useIsLoggedInWithAnsattportenQuery();

  const { t } = useTranslation();

  const handleLoginWithAnsattporten = (): void => {
    window.location.href = loginWithAnsattPorten(window.location.pathname + window.location.search);
  };

  if (isPendingAuthStatus) {
    return <StudioSpinner spinnerTitle={t('general.loading')} />;
  }

  if (ansattportenAuthStatus.isLoggedIn) {
    return <div>View when logged in comes here</div>;
  }

  return (
    <TabContent>
      <StudioHeading level={2} size='sm' spacing>
        {t('settings_modal.maskinporten_tab_title')}
      </StudioHeading>
      <StudioParagraph spacing>{t('settings_modal.maskinporten_tab_description')}</StudioParagraph>
      <StudioButton onClick={handleLoginWithAnsattporten}>
        {t('settings_modal.maskinporten_tab_login_with_ansattporten')}
      </StudioButton>
    </TabContent>
  );
};
