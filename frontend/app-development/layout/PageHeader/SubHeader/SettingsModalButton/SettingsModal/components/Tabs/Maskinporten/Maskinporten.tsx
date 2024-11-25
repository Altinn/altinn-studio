import React, { type ReactNode, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { TabContent } from '../../TabContent';
import { StudioButton, StudioHeading, StudioParagraph, StudioSpinner } from '@studio/components';
import { useIsLoggedInWithAnsattportenQuery } from 'app-development/hooks/queries/useIsLoggedInWithAnsattportenQuery';
import { ScopeList } from './ScopeList';

export const Maskinporten = (): ReactElement => {
  const { data: isLoggedInWithAnsattporten, isPending: isPendingAuthStatus } =
    useIsLoggedInWithAnsattportenQuery();

  const { t } = useTranslation();

  const handleLoginWithAnsattporten = (): void => {
    console.log('Will be implemented in next iteration when backend is ready');
  };

  if (isPendingAuthStatus) {
    return <StudioSpinner spinnerTitle={t('general.loading')} />;
  }

  if (isLoggedInWithAnsattporten) {
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
