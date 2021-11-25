import * as React from 'react';
import { ThemeProvider as ThemeProviderV5 } from '@mui/material/styles';
import {
  ThemeProvider as ThemeProviderV4,
  StylesProvider,
} from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import { HashRouter as Router, Route } from 'react-router-dom';
import AppBarComponent from 'app-shared/navigation/main-header/appBar';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { AltinnButton } from 'app-shared/components';
import { post } from 'app-shared/utils/networking';
import { DashboardActions } from './resources/fetchDashboardResources/dashboardSlice';
import { fetchLanguage } from './resources/fetchLanguage/languageSlice';
import { useAppSelector, useAppDispatch } from 'common/hooks';
import StandaloneDataModelling from 'features/standaloneDataModelling/DataModelling';
import { CloneService } from 'features/cloneService/cloneServices';
import { ServicesOverview } from 'features/serviceOverview/servicesOverview';
import { Dashboard } from 'features/dashboard';

import { generateClassName, themeV4, themeV5 } from 'common/utils/mui-utils';

import './App.css';

export const App = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.dashboard.user);

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
            {user ? (
              <div>
                <AppBarComponent
                  org={user.full_name || user.login}
                  app={null}
                  user={user.login}
                  logoutButton={true}
                  showSubMenu={false}
                />
                <Route
                  path='/'
                  exact={true}
                  render={() => (
                    <Grid
                      container={true}
                      justifyContent='center'
                      direction='row'
                    >
                      <Grid item={true} xs={10}>
                        <ServicesOverview />
                      </Grid>
                    </Grid>
                  )}
                />
                <Route
                  path='/dashboard'
                  exact={true}
                  render={() => (
                    <Grid container={true} justifyContent='center'>
                      <Grid item={true} xs={10}>
                        <Dashboard />
                      </Grid>
                    </Grid>
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
              <Grid>
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
              </Grid>
            )}
          </Router>
        </ThemeProviderV5>
      </ThemeProviderV4>
    </StylesProvider>
  );
};

export default App;
