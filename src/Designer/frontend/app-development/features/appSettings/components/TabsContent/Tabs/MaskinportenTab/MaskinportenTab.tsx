import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import classes from './MaskinportenTab.module.css';
import { useTranslation } from 'react-i18next';
import { LoadingTabData } from '../../LoadingTabData';
import { TabPageHeader } from '../../TabPageHeader';
import { TabPageWrapper } from '../../TabPageWrapper';
import { StudioParagraph } from '@studio/components';
import { useIsLoggedInWithAnsattportenQuery } from '../../../../../../hooks/queries/useIsLoggedInWithAnsattportenQuery';
import { AnsattportenLogin } from './AnsattportenLogin';
import { ScopeListContainer } from './ScopeListContainer';

export function MaskinportenTab(): ReactElement {
  const { t } = useTranslation();
  return (
    <TabPageWrapper>
      <TabPageHeader text={t('app_settings.maskinporten_tab_heading')} />
      <StudioParagraph>{t('app_settings.maskinporten_tab_description')}</StudioParagraph>
      <MaskinportenContent />
    </TabPageWrapper>
  );
}

function MaskinportenContent(): ReactElement {
  const { data: ansattportenAuthStatus, isPending: isPendingAuthStatus } =
    useIsLoggedInWithAnsattportenQuery();

  if (isPendingAuthStatus) {
    return <LoadingTabData />;
  }

  if (ansattportenAuthStatus.isLoggedIn) {
    return (
      <ContentWrapper>
        <ScopeListContainer />
      </ContentWrapper>
    );
  }
  return (
    <ContentWrapper>
      <AnsattportenLogin />
    </ContentWrapper>
  );
}

type ContentWrapperProps = {
  children: ReactNode;
};
function ContentWrapper({ children }: ContentWrapperProps): ReactElement {
  return <div className={classes.contentWrapper}>{children}</div>;
}
