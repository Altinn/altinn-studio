import React from 'react';
import classes from './App.module.css';
import './App.css';
import { Route, Routes } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrganizationsQuery } from '../hooks/queries';
import { StudioPageSpinner } from '@studio/components';
import { ErrorMessage } from 'resourceadm/components/ErrorMessage';
import { PageLayout } from 'resourceadm/pages/PageLayout';
import { ResourcePage } from 'resourceadm/pages/ResourcePage';
import { ResourceDashboardPage } from 'resourceadm/pages/ResourceDashboardPage';
import { ErrorPage } from '../pages/ErrorPage';
import { RedirectPage } from '../pages/RedirectPage';
import { SearchField } from '@altinn/altinn-design-system';
import { ScreenReaderSpan } from 'resourceadm/components/ScreenReaderSpan';
import { useTranslation } from 'react-i18next';

export const App = (): JSX.Element => {
  const { data: user, isError: isUserError } = useUserQuery();
  const { data: organizations, isError: isOrganizationsError } = useOrganizationsQuery();

  const { t } = useTranslation();
  const componentIsReady = user && organizations;

  if (isUserError || isOrganizationsError) {
    return (
      <div>
        {isUserError && (
          <ErrorMessage
            title={t('resourceadm.dashboard_userdata_error_header')}
            message={t('resourceadm.dashboard_userdata_error_body')}
          />
        )}
        {isOrganizationsError && (
          <ErrorMessage
            title={t('resourceadm.dashboard_organizationdata_error_header')}
            message={t('resourceadm.dashboard_organizationdata_error_body')}
          />
        )}
      </div>
    );
  }

  // PageLayout banner uses organization, named as org
  const basePath = '/:org/:app';

  if (componentIsReady) {
    return (
      <div className={classes.root}>
        {/*
            This is a "hack" to make sure that the resourceadm doesnt break. We do not
            use any other dependencies to the old altin-design-system (which for some reason
            is needed). By hiding the component it can not be seen by the user in the browser.
        */}
        <div style={{ display: 'none' }}>
          <SearchField id='hack' aria-labelledby='hack' />
          <ScreenReaderSpan id='hack' label='hack' />
        </div>
        <Routes>
          <Route element={<PageLayout />}>
            <Route path={basePath} element={<ResourceDashboardPage />} />
            <Route path={`${basePath}/resource/:resourceId/:pageType`} element={<ResourcePage />} />
            <Route path='/' element={<ErrorPage />} />
            <Route path='/:org' element={<RedirectPage />} />
          </Route>
        </Routes>
      </div>
    );
  }
  return <StudioPageSpinner />;
};
