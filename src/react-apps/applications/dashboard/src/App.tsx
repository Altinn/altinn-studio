/* tslint:disable:jsx-no-lambda */
// https://github.com/facebook/create-react-app/issues/4801#issuecomment-409553780
// Disabled for React Router rendering

import { createMuiTheme, MuiThemeProvider } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { connect } from 'react-redux';
import { HashRouter as Router, Route } from 'react-router-dom';
import AppBarComponent from '../../shared/src/navigation/main-header/appBar';
import altinnTheme from '../../shared/src/theme/altinnStudioTheme';
import './App.css';
import { CloneService } from './features/cloneService/cloneServices';
import { KnownIssues } from './features/knownIssues/knownIssues';
import { ServicesOverview } from './features/serviceOverview/servicesOverview';
import fetchServicesActionDispatchers from './resources/fetchDashboardResources/fetchDashboardDispatcher';
import fetchLanguageDispatcher from './resources/fetchLanguage/fetchLanguageDispatcher';

export interface IMainDashboardState {
  drawerOpen: boolean;
}

export interface IDashboardProps {
  user: any;
}

const theme = createMuiTheme(altinnTheme);

class App extends React.Component<IDashboardProps, IMainDashboardState> {
  public state: IMainDashboardState = {
    drawerOpen: false,
  };

  public componentDidMount() {
    const altinnWindow: Window = window;

    fetchServicesActionDispatchers.fetchCurrentUser(
      `${altinnWindow.location.origin}/designerapi/User/Current`);

    fetchLanguageDispatcher.fetchLanguage(
      `${altinnWindow.location.origin}/designerapi/Language/GetLanguageAsJSON`, 'nb');

    fetchServicesActionDispatchers.fetchServices(
      `${altinnWindow.location.origin}/designerapi/Repository/Search`);

    fetchServicesActionDispatchers.fetchOrganisations(
      `${altinnWindow.location.origin}/designerapi/Repository/Organizations`);
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
              app=' '
              logoutButton={true}
              showSubHeader={false}
              backgroundColor={theme.altinnPalette.primary.white}
            />
            <Route
              path={'/'}
              exact={true}
              render={() => (
                <Grid container={true} justify='center' direction='row' className='block-with-text' >
                  <Grid item={true} xs={10}>
                    <ServicesOverview />
                  </Grid>
                </Grid>)}
            />
            <Route
              path={'/cloneservice/:org/:serviceName'}
              exact={true}
              component={CloneService}
            />
            <Route
              path={'/knownissues'}
              exact={true}
              component={KnownIssues}
            />
          </div>
        </Router>
      </MuiThemeProvider>
    );
  }
}

const mapStateToProps = (
  state: IDashboardAppState,
): IDashboardProps => {
  return {
    user: state.dashboard.user,
  };
};

export default connect(mapStateToProps)(App);
