import React from 'react';
import classes from './PageLayout.module.css';
import { Outlet, useSearchParams } from 'react-router-dom';
import { StudioButton, StudioHeading, StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import './PageLayout.css';
import { Menu } from '../../components/Menu/Menu';
import { ArrowLeftIcon } from '@studio/icons';

export const PageLayout = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const rawReturnTo = searchParams.get('returnTo') ?? '/';
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/';

  return (
    <div className={classes.container}>
      <div data-color-scheme='dark'>
        <StudioPageHeader>
          <StudioPageHeader.Main>
            <StudioPageHeader.Left title={t('general.back')} showTitle={false} />
          </StudioPageHeader.Main>
          <StudioPageHeader.Sub>
            <div className={classes.subHeader}>
              <StudioButton
                data-color='neutral'
                variant='tertiary'
                icon={<ArrowLeftIcon />}
                onClick={() => {
                  window.location.href = returnTo;
                }}
              >
                {t('shared.header_go_back')}
              </StudioButton>
            </div>
          </StudioPageHeader.Sub>
        </StudioPageHeader>
      </div>
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
