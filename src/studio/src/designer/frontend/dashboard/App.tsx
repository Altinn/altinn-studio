import { createTheme, MuiThemeProvider } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { HashRouter as Router, Route } from 'react-router-dom';
import AppBarComponent from 'app-shared/navigation/main-header/appBar';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { AltinnButton } from 'app-shared/components';
import { post } from 'app-shared/utils/networking';
import { DashboardActions } from './resources/fetchDashboardResources/dashboardSlice';
import { fetchLanguage } from './resources/fetchLanguage/languageSlice';
import { useAppSelector, useAppDispatch } from 'common/hooks';
import StandaloneDataModelling from 'features/standaloneDataModelling/DataModelling';
import { CloneService } from 'features/cloneService/cloneServices';
import { ServicesOverview } from 'features/serviceOverview/servicesOverview';

import './App.css';

const theme = createTheme(altinnTheme);

export const App = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.dashboard.user);

  React.useEffect(() => {
    dispatch(
      DashboardActions.fetchCurrentUser({
        url: `${window.location.origin}/designerapi/User/Current`,
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

    dispatch(
      DashboardActions.fetchOrganisations({
        url: `${window.location.origin}/designer/api/v1/orgs`,
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
    <MuiThemeProvider theme={theme}>
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
                  className='block-with-text'
                >
                  <Grid item={true} xs={10}>
                    <ServicesOverview />
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
    </MuiThemeProvider>
  );
};

export default App;
