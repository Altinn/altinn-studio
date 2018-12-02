/* tslint:disable:jsx-no-lambda */
// https://github.com/facebook/create-react-app/issues/4801#issuecomment-409553780
// Disabled for React Router rendering

import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import AppBarComponent from '../../shared/src/navigation/main-header/app-bar';
import { connect } from 'react-redux';
import NavMenu from '../../shared/src/navigation/NavMenu';
import SubApp from '../../ux-editor/src/SubApp';
import NavigationActionDispatcher from './actions/navigationActions/navigationActionDispatcher';
import './App.css';

import { HashRouter as Router, Redirect, Route } from 'react-router-dom';

const DummySubApp = (name: any) => {
  return (
    <div>Dummy app for {name.name}</div>
  );
};

export interface IAppProps {
  drawerOpen: boolean;
}

class AppClass extends React.Component<IAppProps, any> {

  public handleDrawerToggle = () => {
    NavigationActionDispatcher.toggleDrawer();
  }

  public render() {

    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    // const { org, service, instanceId, reportee } = altinnWindow;

    const routes = [
      {
        path: '/om',
        exact: true,
        activeSubHeaderSelection: 'om',
        menu: 'om',
        subapp: DummySubApp,
      },
      {
        path: '/uieditor',
        activeSubHeaderSelection: 'lage',
        menu: 'lage',
        subapp: SubApp,
      },
      {
        path: '/preview',
        activeSubHeaderSelection: 'lage',
        menu: 'lage',
        subapp: SubApp,
      },
      {
        path: '/sprak',
        activeSubHeaderSelection: 'sprak',
        menu: 'sprak',
        subapp: DummySubApp,
      },
      {
        path: '/teste',
        activeSubHeaderSelection: 'teste',
        menu: 'teste',
        subapp: DummySubApp,
      },
      {
        path: '/publisere',
        activeSubHeaderSelection: 'publisere',
        menu: 'publisere',
        subapp: DummySubApp,
      },
    ];

    return (
      <React.Fragment>
        <Router>
          <Grid container={true} direction='row'>
            <Grid item={true} xs={12}>
              <Route
                exact={true}
                path='/'
                render={() => (
                  <Redirect to='/om' />
                )}
              />
              {routes.map((route, index) => (
                <Route
                  key={index}
                  path={route.path}
                  exact={route.exact}
                  render={(props) => <AppBarComponent
                    {...props}
                    org={org}
                    service={service}
                    showSubHeader={true}
                    activeSubHeaderSelection={route.activeSubHeaderSelection}
                  />}
                />
              ))}
            </Grid>
            <Grid item={true} xs={12}>
              <div style={{ display: 'flex', width: '100%', alignItems: 'stretch' }}>
                <NavMenu handleToggleDrawer={this.handleDrawerToggle} drawerOpen={this.props.drawerOpen} />
                <div style={{ paddingLeft: 10 }}>
                  {routes.map((route, index) => (
                    <Route
                      key={index}
                      path={route.path}
                      render={(props) => <route.subapp
                        {...props}
                        name={route.activeSubHeaderSelection}
                      />}
                    />
                  ))}
                </div>
              </div>
            </Grid>
          </Grid>
        </Router>
      </React.Fragment>
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
