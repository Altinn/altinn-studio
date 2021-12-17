import * as React from 'react';
import { ThemeProvider as ThemeProviderV5, styled } from '@mui/material/styles';
import {
  ThemeProvider as ThemeProviderV4,
  StylesProvider,
} from '@material-ui/core/styles';

import { HashRouter as Router, Route } from 'react-router-dom';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { AltinnButton } from 'app-shared/components';
import { post } from 'app-shared/utils/networking';
import { getLanguageFromKey } from 'app-shared/utils/language';
import {
  DashboardActions,
  SelectedContext,
} from '../resources/fetchDashboardResources/dashboardSlice';
import { fetchLanguage } from '../resources/fetchLanguage/languageSlice';
import Header, {
  IHeaderContext,
  HeaderContext,
} from 'app-shared/navigation/main-header/Header';

import { generateClassName, themeV4, themeV5 } from 'common/utils/muiUtils';
import { useAppSelector, useAppDispatch } from 'common/hooks';
import { CenterContainer } from 'common/components/CenterContainer';
import { Footer } from 'common/components/Footer';
import StandaloneDataModelling from 'features/standaloneDataModelling/DataModelling';
import { useGetOrganizationsQuery } from 'services/organizationApi';
import { Dashboard } from 'features/dashboard';
import { CreateService } from 'features/createService/CreateService';

import './App.css';

const Root = styled('div')(() => ({
  height: '100vh',
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
}));

export const App = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.dashboard.user);
  const language = useAppSelector((state) => state.language.language);
  const selectedContext = useAppSelector(
    (state) => state.dashboard.selectedContext,
  );
  const { data, isLoading: isLoadingOrganizations } =
    useGetOrganizationsQuery();

  const setSelectedContext = (newSelectedContext: SelectedContext) => {
    dispatch(
      DashboardActions.setSelectedContext({
        selectedContext: newSelectedContext,
      }),
    );
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
    const timer = setTimeout(() => {
      if (!user) {
        setShowLogoutButton(true);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [user]);

  return (
    <StylesProvider generateClassName={generateClassName}>
      <ThemeProviderV4 theme={themeV4}>
        <ThemeProviderV5 theme={themeV5}>
          <Router>
            {user && !isLoadingOrganizations ? (
              <Root>
                <HeaderContext.Provider value={headerContextValue}>
                  <Header language={language} />
                </HeaderContext.Provider>
                <Route
                  path='/'
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
                  path='/datamodelling/:org/:repoName'
                  exact={true}
                  component={StandaloneDataModelling}
                />
                <Route path='/new' exact={true} component={CreateService} />
              </Root>
            ) : (
              <CenterContainer>
                <AltinnSpinner
                  spinnerText={getLanguageFromKey(
                    'dashboard.loading',
                    language,
                  )}
                />
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
                    btnText={getLanguageFromKey('dashboard.logout', language)}
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
