import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import OrganizationOverview from './Organization/OrganizationOverview';
import './App.css';
import fetchLanguageDispatcher from './fetchLanguage/fetchLanguageDispatcher';
import fetchServicesActionDispatchers from './Organization/fetchDashboardDispatcher';

export interface IDashboardState {
  drawerOpen: boolean;
}

export interface IDashboardProps { }

class App extends React.Component<IDashboardProps, IDashboardState> {
  state: IDashboardState = {
    drawerOpen: false,
  };

  public componentDidMount() {
    const altinnWindow: Window = window;
    fetchLanguageDispatcher.fetchLanguage(
      `${altinnWindow.location.origin}/designerapi/Language/GetLanguageAsJSON`, 'nb');

    fetchServicesActionDispatchers.fetchServices(
      `${altinnWindow.location.origin}/designerapi/Repository/Search`);

    fetchServicesActionDispatchers.fetchOrganizations(
      `${altinnWindow.location.origin}/designerapi/Repository/Organizations`);
    fetchServicesActionDispatchers.fetchCurrentUser(
      `${altinnWindow.location.origin}/designerapi/User/Current`);
  }

  public handleDrawerToggle = () => {
    this.setState((state: IDashboardState) => {
      return {
        drawerOpen: !state.drawerOpen,
      };
    });
  }

  public render() {
    return (
      <Grid container={true} justify='center' direction='row' className='block-with-text' >
        <Grid item={true} xs={10}>
          <OrganizationOverview />
        </Grid>
      </Grid>
    );
  }
}

export default App;
