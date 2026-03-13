import React from 'react';
import { Outlet } from 'react-router-dom';
import { StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './PageLayout.module.css';

export const PageLayout = () => {
  const { t } = useTranslation();

  return (
    <div className={classes.root}>
      <StudioPageHeader>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left title={t('general.back')} showTitle={false} />
        </StudioPageHeader.Main>
      </StudioPageHeader>
      <Outlet />
    </div>
  );
};
