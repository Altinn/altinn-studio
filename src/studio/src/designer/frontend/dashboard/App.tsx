import { createTheme, MuiThemeProvider } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HashRouter as Router, Route } from 'react-router-dom';
import AppBarComponent from 'app-shared/navigation/main-header/appBar';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { StandaloneDataModelling } from './features';
import { CloneService } from './features/cloneService/cloneServices';
import { KnownIssues } from './features/knownIssues/knownIssues';
import { ServicesOverview } from './features/serviceOverview/servicesOverview';
import { DashboardActions } from './resources/fetchDashboardResources/dashboardSlice';
import { fetchLanguage } from './resources/fetchLanguage/languageSlice';

import './App.css';

const theme = createTheme(altinnTheme);

export const App = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.dashboard.user);

  useEffect(() => {
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
        url: `${window.location.origin}/designerapi/Repository/UserRepos`,
      }),
    );

    dispatch(
      DashboardActions.fetchOrganisations({
        url: `${window.location.origin}/designerapi/Repository/Organizations`,
      }),
    );
  }, [dispatch]);

  return (
    <MuiThemeProvider theme={theme}>
      <Router>
        <div>
          <AppBarComponent
            org={user ? user.full_name || user.login : ''}
            app={null}
            user={user.login}
            logoutButton={true}
            showSubMenu={false}
          />
          <Route
            path='/'
            exact={true}
            render={() => (
              <Grid container={true} justifyContent='center' direction='row' className='block-with-text'>
                <Grid item={true} xs={10}>
                  <ServicesOverview />
                </Grid>
              </Grid>
            )}
          />
          <Route path='/clone-app/:org/:serviceName' exact={true} component={CloneService} />
          <Route path='/known-issues' exact={true} component={KnownIssues} />
          <Route path='/datamodelling/:org/:repoName' exact={true} component={StandaloneDataModelling} />
        </div>
      </Router>
    </MuiThemeProvider>
  );
};

export default App;
