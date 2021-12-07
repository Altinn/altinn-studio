import * as React from 'react';
import { ThemeProvider as ThemeProviderV5 } from '@mui/material/styles';
import {
  ThemeProvider as ThemeProviderV4,
  StylesProvider,
} from '@material-ui/core/styles';
import { HashRouter as Router, Route } from 'react-router-dom';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { AltinnButton } from 'app-shared/components';
import { post } from 'app-shared/utils/networking';
import {
  DashboardActions,
  SelectedContext,
} from './resources/fetchDashboardResources/dashboardSlice';
import { fetchLanguage } from './resources/fetchLanguage/languageSlice';
import Header, {
  IHeaderContext,
  HeaderContext,
} from 'app-shared/navigation/main-header/Header';
import { useAppSelector, useAppDispatch } from 'common/hooks';
import { CenterContainer } from 'common/components/CenterContainer';
import { Footer } from 'common/components/Footer';
import StandaloneDataModelling from 'features/standaloneDataModelling/DataModelling';
import { CloneService } from 'features/cloneService/cloneServices';
import { ServicesOverview } from 'features/serviceOverview/servicesOverview';
import { useGetOrganizationsQuery } from 'services/organizationApi';
import { Dashboard } from 'features/dashboard';

import { generateClassName, themeV4, themeV5 } from 'common/utils/muiUtils';

import './App.css';

export const App = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.dashboard.user);
  const language = useAppSelector((state) => state.language.language);
  const selectedContext = useAppSelector(
    (state) => state.dashboard.selectedContext,
  );
  const { data, isLoading: isLoadingOrganizations } =
    useGetOrganizationsQuery();

  const setSelectedContext = (selectedContext: SelectedContext) => {
    dispatch(DashboardActions.setSelectedContext({ selectedContext }));
  };

  const headerContextValue: IHeaderContext = {
    selectableOrgs: data,
    selectedContext,
    setSelectedContext,
    user,
  };

  React.useEffect(() => {
    dispatch(
      DashboardActions.fetchCurrentUser({
        url: `${window.location.origin}/designer/api/v1/user/current`,
      }),
    );

    dispatch(
      fetchLanguage({
        url: `${window.location.origin}/designerapi/Language/GetLanguageAsJSON`,
        languageCode: 'nb',
      }),
    );

    dispatch(
      DashboardActions.fetchServices({
        url: `${window.location.origin}/designer/api/v1/user/repos`,
      }),
    );
  }, [dispatch]);

  const [showLogOutButton, setShowLogoutButton] = React.useState(false);
  React.useEffect(() => {
    if (!user) {
      setTimeout(() => setShowLogoutButton(true), 5000);
    }
  }, [user]);

  return (
    <StylesProvider generateClassName={generateClassName}>
      <ThemeProviderV4 theme={themeV4}>
        <ThemeProviderV5 theme={themeV5}>
          <Router>
            {user && !isLoadingOrganizations ? (
              <div
                style={{
                  height: '100vh',
                  display: 'grid',
                  gridTemplateRows: 'auto 1fr',
                }}
              >
                <HeaderContext.Provider value={headerContextValue}>
                  <Header language={language} />
                </HeaderContext.Provider>
                <Route
                  path='/'
                  exact={true}
                  render={() => (
                    <CenterContainer>
                      <ServicesOverview />
                    </CenterContainer>
                  )}
                />
                <Route
                  path='/dashboard'
                  exact={true}
                  render={() => (
                    <>
                      <CenterContainer>
                        <Dashboard />
                      </CenterContainer>
                      <Footer />
                    </>
                  )}
                />
                <Route
                  path='/clone-app/:org/:serviceName'
                  exact={true}
                  component={CloneService}
                />
                <Route
                  path='/datamodelling/:org/:repoName'
                  exact={true}
                  component={StandaloneDataModelling}
                />
              </div>
            ) : (
              <CenterContainer>
                <AltinnSpinner spinnerText='Venter på svar' />
                {showLogOutButton && (
                  <AltinnButton
                    onClickFunction={() =>
                      post(`${window.location.origin}/repos/user/logout`).then(
                        () => {
                          window.location.assign(
                            `${window.location.origin}/Home/Logout`,
                          );
                        },
                      )
                    }
                    btnText={'Logg ut'}
                  />
                )}
              </CenterContainer>
            )}
          </Router>
        </ThemeProviderV5>
      </ThemeProviderV4>
    </StylesProvider>
  );
};

export default App;
