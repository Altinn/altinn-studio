import Grid from '@material-ui/core/Grid';
import * as React from 'react';
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

  public componentDidMount() {

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
