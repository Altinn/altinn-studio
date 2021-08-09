/* tslint:disable:jsx-no-lambda */
// https://github.com/facebook/create-react-app/issues/4801#issuecomment-409553780
// Disabled for React Router rendering

import { createTheme, MuiThemeProvider } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { connect } from 'react-redux';
import { HashRouter as Router, Route } from 'react-router-dom';
import AppBarComponent from 'app-shared/navigation/main-header/appBar';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import './App.css';
import { Dispatch } from 'redux';
import { StandaloneDataModelling } from './features';
import { CloneService } from './features/cloneService/cloneServices';
import { KnownIssues } from './features/knownIssues/knownIssues';
import { ServicesOverview } from './features/serviceOverview/servicesOverview';
import { DashboardActions } from './resources/fetchDashboardResources/dashboardSlice';
import { fetchLanguage } from './resources/fetchLanguage/languageSlice';

export interface IMainDashboardState {
  drawerOpen: boolean;
}

export interface IDashboardProvidedProps {
  dispatch?: Dispatch;
}

export interface IDashboardProps extends IDashboardProvidedProps {
  user: any;
}

const theme = createTheme(altinnTheme);

class App extends React.Component<IDashboardProps, IMainDashboardState> {
  public state: IMainDashboardState = {
    drawerOpen: false,
  };

  public componentDidMount() {
    const altinnWindow: Window = window;

    this.props.dispatch(DashboardActions.fetchCurrentUser({
      url: `${altinnWindow.location.origin}/designerapi/User/Current`,
    }));

    this.props.dispatch(fetchLanguage({
      url: `${altinnWindow.location.origin}/designerapi/Language/GetLanguageAsJSON`,
      languageCode: 'nb',
    }));

    this.props.dispatch(DashboardActions.fetchServices({
      url: `${altinnWindow.location.origin}/designerapi/Repository/UserRepos`,
    }));

    this.props.dispatch(DashboardActions.fetchOrganisations({
      url: `${altinnWindow.location.origin}/designerapi/Repository/Organizations`,
    }));
  }

  public handleDrawerToggle = () => {
    this.setState((state: IMainDashboardState) => {
      return {
        drawerOpen: !state.drawerOpen,
      };
    });
  }

  public render() {
    return (
      <MuiThemeProvider theme={theme}>
        <Router>
          <div>
            <AppBarComponent
              org={this.props.user ? this.props.user.full_name || this.props.user.login : ''}
              app={null}
              user={this.props.user.login}
              logoutButton={true}
              showSubMenu={false}
            />
            <Route
              path='/'
              exact={true}
              render={() => (
                <Grid
                  container={true} justify='center'
                  direction='row' className='block-with-text'
                >
                  <Grid item={true} xs={10}>
                    <ServicesOverview />
                  </Grid>
                </Grid>)}
            />
            <Route
              path='/clone-app/:org/:serviceName'
              exact={true}
              component={CloneService}
            />
            <Route
              path='/known-issues'
              exact={true}
              component={KnownIssues}
            />
            <Route
              path='/datamodelling/:org/:repoName'
              exact={true}
              component={StandaloneDataModelling}
            />
          </div>
        </Router>
      </MuiThemeProvider>
    );
  }
}

const mapStateToProps = (
  state: IDashboardAppState,
  props: IDashboardProvidedProps,
): IDashboardProps => {
  return {
    user: state.dashboard.user,
    dispatch: props.dispatch,
  };
};

export default connect(mapStateToProps)(App);
