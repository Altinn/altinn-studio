import React from 'react';
import type { ReactElement } from 'react';
import classes from './MaskinportenTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabPageHeader } from '../../TabPageHeader';
import { TabPageWrapper } from '../../TabPageWrapper';
import { StudioParagraph } from '@studio/components';
import { ScopeListContainer } from './ScopeListContainer';

export function MaskinportenTab(): ReactElement {
  const { t } = useTranslation();
  return (
    <TabPageWrapper>
      <TabPageHeader text={t('app_settings.maskinporten_tab_heading')} />
      <StudioParagraph>{t('app_settings.maskinporten_tab_description')}</StudioParagraph>
      <div className={classes.contentWrapper}>
        <ScopeListContainer />
      </div>
    </TabPageWrapper>
  );
}
