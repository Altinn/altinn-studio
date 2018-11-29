import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import Dashboard from '../src/components/Dashboard';
import OrganizationOverview from '../src/components/OrganizationOverview';
import './App.css';

export interface IDashboardState {
  drawerOpen: boolean;
}

export interface IDashboardProps { }

class App extends React.Component<IDashboardProps, IDashboardState> {
  state: IDashboardState = {
    drawerOpen: false,
  };

  public handleDrawerToggle = () => {
    this.setState((state: IDashboardState) => {
      return {
        drawerOpen: !state.drawerOpen,
      };
    });
  }

  public render() {
    let hasOneOrg = false;

    return (
      <Grid container={true} justify='center' direction='row' >
        <Grid item={true} xs={10}>
          {hasOneOrg ? (
            <Dashboard />
          ) : (
              <OrganizationOverview />
            )}
        </Grid>
      </Grid>
    );
  }
}

export default App;
