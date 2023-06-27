import React from 'react';
import classes from './App.module.css';
import './App.css';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrganizationsQuery } from '../hooks/queries';
import { PageSpinner } from 'app-shared/components';
import { ErrorMessage } from 'resourceadm/components/ErrorMessage';
import { PageLayout } from 'resourceadm/pages/PageLayout';
import { ResourcePage } from 'resourceadm/pages/ResourcePage';
import { ResourceDashboardPage } from 'resourceadm/pages/ResourceDashboardPage';
import { ErrorPage } from '../pages/ErrorPage';
import { RedirectPage } from '../pages/RedirectPage';
import { SearchField } from '@altinn/altinn-design-system';
import { ScreenReaderSpan } from 'resourceadm/components/ScreenReaderSpan';

export const App = (): JSX.Element => {
  const { t } = useTranslation();

  const { data: user, isError: isUserError } = useUserQuery();
  const { data: organizations, isError: isOrganizationsError } = useOrganizationsQuery();

  const componentIsReady = user && organizations;
  const componentHasError = isUserError || isOrganizationsError;

  const getErrorMessage = (): { title: string; message: string } => {
    const defaultTitle = 'Feil oppstod ved innlasting av';
    const defaultMessage = 'Vi beklager men en feil oppstod ved henting av';
    if (isUserError) {
      return {
        title: `${defaultTitle} brukerdata`,
        message: `${defaultMessage} dine brukerdata.`,
      };
    }
    if (isOrganizationsError) {
      return {
        title: `${defaultTitle} organisasjoner`,
        message: `${defaultMessage} organisasjoner som kreves for å kjøre applikasjonen.`,
      };
    }
    return {
      title: 'Ukjent feil oppstod',
      message: 'Vi beklager men en ukjent feil, vennligst prøv igjen senere.',
    };
  };

  if (componentHasError) {
    const error = getErrorMessage();
    return <ErrorMessage title={error.title} message={error.message} />;
  }

  // PageLayout banner uses organization, named as selectedContext
  const basePath = '/:selectedContext/:repo';

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
            <Route path='/:selectedContext' element={<RedirectPage />} />
            <Route path='/:selectedContext/:repo/*' element={<ErrorPage />} />
          </Route>
        </Routes>
      </div>
    );
  }
  return <PageSpinner text={t('dashboard.loading')} />;
};
