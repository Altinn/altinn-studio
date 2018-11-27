import * as React from 'react';
import { connect } from 'react-redux';
import NavMenu from '../../shared/src/navigation/NavMenu';
import SubApp from '../../ux-editor/src/SubApp';
import NavigationActionDispatcher from './actions/navigationActions/navigationActionDispatcher';
import './App.css';

export interface IAppProps {
  drawerOpen: boolean;
}

const styles: any = {
  root: {
    background: '#EFEFEF',
    top: '69px',
  },
  mainContent: {
    paddingLeft: '72px',
  },
};

class AppClass extends React.Component<IAppProps, any> {

  public handleDrawerToggle = () => {
    NavigationActionDispatcher.toggleDrawer();
  }

  public render() {
    return (
      <div style={styles.root}>
        <NavMenu handleToggleDrawer={this.handleDrawerToggle} drawerOpen={this.props.drawerOpen} />
        <div style={styles.mainContent}>
          <SubApp />
        </div>
      </div>
    );
  }
}

const mapsStateToProps = (
  state: IServiceDevelopmentAppState,
): IAppProps => {
  return {
    drawerOpen: state.serviceDevelopment.drawerOpen,
  };
};

const App = connect(mapsStateToProps)(AppClass);
export default App;
