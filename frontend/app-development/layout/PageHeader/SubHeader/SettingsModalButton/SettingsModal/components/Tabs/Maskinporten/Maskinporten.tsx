import React, { type ReactNode, type ReactElement } from 'react';
import classes from './Maskinporten.module.css';
import { useTranslation } from 'react-i18next';
import { TabContent } from '../../TabContent';
import { StudioHeading, StudioParagraph, StudioSpinner } from '@studio/components-legacy';
import { useIsLoggedInWithAnsattportenQuery } from 'app-development/hooks/queries/useIsLoggedInWithAnsattportenQuery';
import { ScopeListContainer } from './ScopeListContainer';
import { AnsattportenLogin } from './AnsattportenLogin';

export const Maskinporten = (): ReactElement => {
  const { data: ansattportenAuthStatus, isPending: isPendingAuthStatus } =
    useIsLoggedInWithAnsattportenQuery();

  const { t } = useTranslation();

  if (isPendingAuthStatus) {
    return <StudioSpinner spinnerTitle={t('general.loading')} />;
  }

  if (ansattportenAuthStatus.isLoggedIn) {
    return (
      <MaskinportenPageTemplate>
        <ScopeListContainer />
      </MaskinportenPageTemplate>
    );
  }

  return (
    <MaskinportenPageTemplate>
      <AnsattportenLogin />
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
      <StudioParagraph spacing>{t('settings_modal.maskinporten_tab_description')}</StudioParagraph>
      <div className={classes.contentWrapper}>{children}</div>
    </TabContent>
  );
};
