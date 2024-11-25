import React, { type ReactNode, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { TabContent } from '../../TabContent';
import { StudioButton, StudioHeading, StudioParagraph, StudioSpinner } from '@studio/components';
import { useIsLoggedInWithAnsattportenQuery } from '../../../../../../../../hooks/queries/useIsLoggedInWithAnsattportenQuery';
import { loginWithAnsattPorten } from 'app-shared/api/paths';
import { ScopeList } from './ScopeList';

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
    return (
      <MaskinportenPageTemplate>
        <ScopeList />
      </MaskinportenPageTemplate>
    );
  }

  return (
    <MaskinportenPageTemplate>
      <StudioParagraph spacing>{t('settings_modal.maskinporten_tab_description')}</StudioParagraph>
      <StudioButton onClick={handleLoginWithAnsattporten}>
        {t('settings_modal.maskinporten_tab_login_with_ansattporten')}
      </StudioButton>
    </MaskinportenPageTemplate>
  );
};

type MaskinportenPageTemplateProps = {
  children: ReactNode;
};

const MaskinportenPageTemplate = ({ children }: MaskinportenPageTemplateProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <TabContent>
      <StudioHeading level={2} size='sm' spacing>
        {t('settings_modal.maskinporten_tab_title')}
      </StudioHeading>
      {children}
    </TabContent>
  );
};
