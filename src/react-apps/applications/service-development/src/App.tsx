/* tslint:disable:jsx-no-lambda */
// https://github.com/facebook/create-react-app/issues/4801#issuecomment-409553780
// Disabled for React Router rendering

import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { connect } from 'react-redux';
import LeftDrawerMenu from '../../shared/src/navigation/drawer/LeftDrawerMenu';
import AppBarComponent from '../../shared/src/navigation/main-header/app-bar';
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
        path: '/about',
        exact: true,
        activeSubHeaderSelection: 'om',
        menu: 'about',
        subapp: DummySubApp,
      },
      {
        path: '/uieditor',
        activeSubHeaderSelection: 'lage',
        menu: 'create',
        subapp: SubApp,
      },
      {
        path: '/preview',
        activeSubHeaderSelection: 'lage',
        menu: 'create',
        subapp: SubApp,
      },
      {
        path: '/language',
        activeSubHeaderSelection: 'sprak',
        menu: 'language',
        subapp: DummySubApp,
      },
      {
        path: '/test',
        activeSubHeaderSelection: 'teste',
        menu: 'test',
        subapp: DummySubApp,
      },
      {
        path: '/publish',
        activeSubHeaderSelection: 'publisere',
        menu: 'publish',
        subapp: DummySubApp,
      },
      {
        path: '/aboutservice',
        activeSubHeaderSelection: 'om',
        activeLeftMenuSelection: 'omtjenesten',
        menu: 'about',
        subapp: DummySubApp,
      },
      {
        path: '/rolesandrights',
        activeSubHeaderSelection: 'om',
        activeLeftMenuSelection: 'roller',
        menu: 'about',
        subapp: DummySubApp,
      },
      {
        path: '/production',
        activeSubHeaderSelection: 'om',
        activeLeftMenuSelection: 'produksjon',
        menu: 'about',
        subapp: DummySubApp,
      },
      {
        path: '/versionhistory',
        activeSubHeaderSelection: 'om',
        activeLeftMenuSelection: 'versjonshistorikk',
        menu: 'about',
        subapp: DummySubApp,
      },
      {
        path: '/aboutenduser',
        activeSubHeaderSelection: 'om',
        activeLeftMenuSelection: 'omsluttbrukeren',
        menu: 'about',
        subapp: DummySubApp,
      },
      {
        path: '/altinn',
        activeSubHeaderSelection: 'om',
        activeLeftMenuSelection: 'altinn',
        menu: 'about',
        subapp: DummySubApp,
      },
      {
        path: '/datamodel',
        activeSubHeaderSelection: 'lage',
        activeLeftMenuSelection: 'datamodel',
        menu: 'create',
        subapp: DummySubApp,
      },
      {
        path: '/api',
        activeSubHeaderSelection: 'lage',
        activeLeftMenuSelection: 'api',
        menu: 'create',
        subapp: DummySubApp,
      },
      {
        path: '/text',
        activeSubHeaderSelection: 'sprak',
        activeLeftMenuSelection: 'text',
        menu: 'language',
        subapp: DummySubApp,
      },
      {
        path: '/translate',
        activeSubHeaderSelection: 'sprak',
        activeLeftMenuSelection: 'flere sprak',
        menu: 'language',
        subapp: DummySubApp,
      },
      {
        path: '/productionsetting',
        activeSubHeaderSelection: 'publisere',
        activeLeftMenuSelection: 'text',
        menu: 'publish',
        subapp: DummySubApp,
      },
      {
        path: '/status',
        activeSubHeaderSelection: 'publisere',
        activeLeftMenuSelection: 'status',
        menu: 'publish',
        subapp: DummySubApp,
      },
    ];

    return (
      <React.Fragment>
        <Router>
          <Grid container={true} direction='column'>
            <Grid item={true} xs={12}>
              <Route
                exact={true}
                path='/'
                render={() => (
                  <Redirect to='/about' />
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
              <div style={{ top: 50 }}>
                {routes.map((route, index) => (
                  <Route
                    key={index}
                    path={route.path}
                    exact={route.exact}
                    render={(props) => <LeftDrawerMenu
                      {...props}
                      menuType={route.menu}
                    />}
                  />
                ))}
              </div>
              <div style={{ paddingLeft: 100 }}>
                {routes.map((route, index) => (
                  <Route
                    key={index}
                    path={route.path}
                    render={(props) => <route.subapp
                      {...props}
                      name={route.path}
                    />}
                  />
                ))}
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
