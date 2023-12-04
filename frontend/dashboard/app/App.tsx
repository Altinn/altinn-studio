import React from 'react';
import classes from './App.module.css';
import { StudioPageSpinner } from '@studio/components';
import { CreateService } from '../pages/CreateService';
import { Dashboard } from '../pages/Dashboard';
import { Route, Routes } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrganizationsQuery } from '../hooks/queries';
import { ErrorMessage } from 'dashboard/components/ErrorMessage';

import './App.css';
import { PageLayout } from 'dashboard/pages/PageLayout';

export const App = (): JSX.Element => {
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

  if (componentIsReady) {
    return (
      <div className={classes.root}>
        <Routes>
          <Route element={<PageLayout />}>
            <Route
              path='/:selectedContext?'
              element={<Dashboard user={user} organizations={organizations} />}
            />
            <Route
              path='/:selectedContext/new'
              element={<CreateService organizations={organizations} user={user} />}
            />
          </Route>
        </Routes>
      </div>
    );
  }

  return (
    <div className={classes.appDashboardSpinner}>
      <StudioPageSpinner />
    </div>
  );
};
