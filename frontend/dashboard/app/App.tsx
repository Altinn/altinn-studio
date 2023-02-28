import React from 'react';
import './App.css';
import classes from './App.module.css';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import type { SelectedContext } from '../resources/fetchDashboardResources/dashboardSlice';
import { AltinnSpinner } from 'app-shared/components';
import { CenterContainer } from '../components/CenterContainer';
import { CreateService } from '../pages/CreateService';
import { Dashboard } from '../pages/Dashboard';
import { DashboardActions } from '../resources/fetchDashboardResources/dashboardSlice';
import { DataModellingContainer } from '../pages/DataModelling';
import { Route, Routes } from 'react-router-dom';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { useGetOrganizationsQuery } from '../services/organizationApi';
import { userHasAccessToSelectedContext } from '../utils/userUtils';
import AppHeader, {
  HeaderContext,
  SelectedContextType,
} from 'app-shared/navigation/main-header/Header';
import { useTranslation } from 'react-i18next';
import { useUserQuery } from '../hooks/useUserQueries';
import { useOrganizationsQuery } from 'dashboard/hooks/useOrganizationQueries';
import { ErrorMessage } from 'dashboard/components/ErrorMessage';

export const App = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const { data: user, isError: isUserError } = useUserQuery();
  const { data: organizations, isError: isOrganizationsError } = useOrganizationsQuery();

  const selectedContext = useAppSelector((state) => state.dashboard.selectedContext);
  const { t } = useTranslation();

  // TODO this should be fixed when we have TQ within the entire dashboard
  const setSelectedContext = (newSelectedContext: SelectedContext) =>
    dispatch(
      DashboardActions.setSelectedContext({
        selectedContext: newSelectedContext,
      })
    );

  if (organizations && !userHasAccessToSelectedContext({ selectedContext, orgs: organizations })) {
    setSelectedContext(SelectedContextType.Self);
  }

  const headerContextValue: IHeaderContext = {
    selectableOrgs: organizations,
    selectedContext,
    setSelectedContext,
    user,
  };

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
          <Route path='/' element={<Dashboard user={user} />} />
          <Route path='/datamodelling/:org/:repoName' element={<DataModellingContainer />} />
          <Route path='/new' element={<CreateService />} />
        </Routes>
      </div>
    );
  }

  return (
    <CenterContainer>
      <AltinnSpinner spinnerText={t('dashboard.loading')} />
    </CenterContainer>
  );
};
