import * as React from 'react';
import { connect } from 'react-redux';
import LeftDrawerMenu from '../../shared/src/navigation/drawer/LeftDrawerMenu';
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
        <LeftDrawerMenu />
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
