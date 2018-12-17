import { createMuiTheme, MuiThemeProvider } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { connect } from 'react-redux';
import AppBarComponent from '../../shared/src/navigation/main-header/appBar';
import altinnTheme from '../../shared/src/theme/altinnStudioTheme';
import './App.css';
import fetchLanguageDispatcher from './fetchLanguage/fetchLanguageDispatcher';
import fetchServicesActionDispatchers from './services/fetchDashboardDispatcher';
import { ServicesOverview } from './services/servicesOverview';

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
    fetchLanguageDispatcher.fetchLanguage(
      `${altinnWindow.location.origin}/designerapi/Language/GetLanguageAsJSON`, 'nb');

    fetchServicesActionDispatchers.fetchServices(
      `${altinnWindow.location.origin}/designerapi/Repository/Search`);

    fetchServicesActionDispatchers.fetchCurrentUser(
      `${altinnWindow.location.origin}/designerapi/User/Current`);
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
        <AppBarComponent
          org={this.props.user.full_name || this.props.user.login}
          service=' '
          showSubHeader={false}
          backgroundColor={theme.altinnPalette.primary.white}
        />
        <Grid container={true} justify='center' direction='row' className='block-with-text' >
          <Grid item={true} xs={10}>
            <ServicesOverview />
          </Grid>
        </Grid>
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
