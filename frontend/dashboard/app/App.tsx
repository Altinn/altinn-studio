import React, { useEffect, useMemo } from 'react';
import classes from './App.module.css';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import { PageSpinner } from 'app-shared/components';
import { CreateService } from '../pages/CreateService';
import { Dashboard } from '../pages/Dashboard';
import { Route, Routes } from 'react-router-dom';
import { userHasAccessToSelectedContext } from '../utils/userUtils';
import AppHeader, {
  HeaderContext,
  SelectedContextType,
} from 'app-shared/navigation/main-header/Header';
import { useTranslation } from 'react-i18next';
import { useUserQuery } from '../hooks/useUserQueries';
import { useOrganizationsQuery } from 'dashboard/hooks/useOrganizationQueries';
import { ErrorMessage } from 'dashboard/components/ErrorMessage';
import { useAppContext } from '../contexts/appContext';

import './App.css';

export const App = (): JSX.Element => {
  const { t } = useTranslation();
  const { selectedContext, setSelectedContext } = useAppContext();
  const { data: user, isError: isUserError } = useUserQuery();
  const { data: organizations, isError: isOrganizationsError } = useOrganizationsQuery();

  useEffect(() => {
    if (
      organizations &&
      !userHasAccessToSelectedContext({ selectedContext, orgs: organizations })
    ) {
      setSelectedContext(SelectedContextType.Self);
    }
  }, [organizations, selectedContext, setSelectedContext]);

  const headerContextValue: IHeaderContext = useMemo(
    () => ({
      selectableOrgs: organizations,
      selectedContext,
      setSelectedContext,
      user,
    }),
    [organizations, user, setSelectedContext, selectedContext]
  );

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
        <HeaderContext.Provider value={headerContextValue}>
          <AppHeader />
        </HeaderContext.Provider>
        <Routes>
          <Route path='/' element={<Dashboard user={user} organizations={organizations} />} />
          <Route
            path='/new'
            element={<CreateService organizations={organizations} user={user} />}
          />
        </Routes>
      </div>
    );
  }

  return <PageSpinner text={t('dashboard.loading')} />;
};
