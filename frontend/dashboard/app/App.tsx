import React, { useEffect, useState } from 'react';
import './App.css';
import classes from './App.module.css';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import type { SelectedContext } from '../resources/fetchDashboardResources/dashboardSlice';
import { AltinnSpinner } from 'app-shared/components';
import { Button } from '@altinn/altinn-design-system';
import { CenterContainer } from '../common/components/CenterContainer';
import { CreateService } from '../features/createService/CreateService';
import { Dashboard } from '../features/dashboard/Dashboard';
import { DashboardActions } from '../resources/fetchDashboardResources/dashboardSlice';
import { DataModellingContainer } from '../features/standaloneDataModelling/DataModelling';
import { Route, Routes } from 'react-router-dom';
import { fetchLanguage } from '../resources/fetchLanguage/languageSlice';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { post } from 'app-shared/utils/networking';
import { useAppDispatch, useAppSelector } from '../common/hooks';
import { useGetOrganizationsQuery } from '../services/organizationApi';
import { userHasAccessToSelectedContext } from '../common/utils';
import AppHeader, {
  HeaderContext,
  SelectedContextType,
} from 'app-shared/navigation/main-header/Header';
import {
  frontendLangPath,
  userCurrentPath,
  userLogoutAfterPath,
  userLogoutPath,
  userReposPath,
} from 'app-shared/api-paths';

export const App = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.dashboard.user);
  const language = useAppSelector((state) => state.language.language);
  const selectedContext = useAppSelector((state) => state.dashboard.selectedContext);
  const { data: orgs = [], isLoading: isLoadingOrganizations } = useGetOrganizationsQuery();

  const setSelectedContext = (newSelectedContext: SelectedContext) =>
    dispatch(
      DashboardActions.setSelectedContext({
        selectedContext: newSelectedContext,
      })
    );

  if (!isLoadingOrganizations && !userHasAccessToSelectedContext({ selectedContext, orgs })) {
    setSelectedContext(SelectedContextType.Self);
  }

  const headerContextValue: IHeaderContext = {
    selectableOrgs: orgs,
    selectedContext,
    setSelectedContext,
    user,
  };

  useEffect(() => {
    dispatch(DashboardActions.fetchCurrentUser({ url: userCurrentPath() }));
    dispatch(fetchLanguage({ url: frontendLangPath('nb') }));
    dispatch(DashboardActions.fetchServices({ url: userReposPath() }));
  }, [dispatch]);

  const [showLogOutButton, setShowLogoutButton] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) {
        setShowLogoutButton(true);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [user]);

  return user && !isLoadingOrganizations ? (
    <div className={classes.root}>
      <HeaderContext.Provider value={headerContextValue}>
        <AppHeader language={language} />
      </HeaderContext.Provider>
      <Routes>
        <Route path='/' element={<Dashboard />} />
        <Route path='/datamodelling/:org/:repoName' element={<DataModellingContainer />} />
        <Route path='/new' element={<CreateService />} />
      </Routes>
    </div>
  ) : (
    <CenterContainer>
      <AltinnSpinner spinnerText={getLanguageFromKey('dashboard.loading', language)} />
      {showLogOutButton && (
        <Button
          onClick={() =>
            post(userLogoutPath()).then(() => window.location.assign(userLogoutAfterPath()))
          }
        >
          {getLanguageFromKey('dashboard.logout', language)}
        </Button>
      )}
    </CenterContainer>
  );
};
