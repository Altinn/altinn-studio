import * as React from 'react';
import NavMenu from '../../shared/src/navigation/NavMenu';
import './App.css';

export interface IDashboardState {
  drawerOpen: boolean;
}

export interface IDashboardProps {}

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
    return (
      <div style={{display: 'flex', width: '100%', alignItems: 'stretch'}}>
      <NavMenu handleToggleDrawer={this.handleDrawerToggle} drawerOpen={this.state.drawerOpen}/>
        <div style={{paddingLeft: 72}}/>
        {/* Content here */}
      </div>
    );
  }
}

export default App;
