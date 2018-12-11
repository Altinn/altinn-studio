import { createMuiTheme, MuiThemeProvider } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import altinnTheme from '../../shared/src/theme/altinnStudioTheme';
import './App.css';
import fetchLanguageDispatcher from './fetchLanguage/fetchLanguageDispatcher';
import fetchServicesActionDispatchers from './services/fetchDashboardDispatcher';
import ServicesOverview from './services/servicesOverview';

export interface IMainDashboardState {
  drawerOpen: boolean;
}

export interface IDashboardProps { }

const theme = createMuiTheme(altinnTheme);

class App extends React.Component<IDashboardProps, IMainDashboardState> {
  state: IMainDashboardState = {
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
        <Grid container={true} justify='center' direction='row' className='block-with-text' >
          <Grid item={true} xs={10}>
            <ServicesOverview />
          </Grid>
        </Grid>
      </MuiThemeProvider>
    );
  }
}

export default App;
