import React from 'react';
import classes from './PageLayout.module.css';
import { Outlet } from 'react-router-dom';
import { StudioHeading, StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import './PageLayout.css';
import { Menu } from '../../components/Menu/Menu';

export const PageLayout = () => {
  const { t } = useTranslation();

  return (
    <div className={classes.container}>
      <StudioPageHeader>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left title={t('general.back')} showTitle={false} />s
        </StudioPageHeader.Main>
      </StudioPageHeader>
      <div className={classes.content}>
        <StudioHeading level={2} className={classes.settingsHeading}>
          {t('user.settings')}
        </StudioHeading>
        <div className={classes.pageContentWrapper}>
          <div className={classes.leftNavWrapper}>
            <Menu />
          </div>
          <div className={classes.contentWrapper}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};
