/* tslint:disable:jsx-no-lambda */
// https://github.com/facebook/create-react-app/issues/4801#issuecomment-409553780
// Disabled for React Router rendering

import Grid from '@material-ui/core/Grid';
import Hidden from '@material-ui/core/Hidden';
import { MuiThemeProvider, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import LeftDrawerMenu from '../../shared/src/navigation/drawer/LeftDrawerMenu';
import AppBarComponent from '../../shared/src/navigation/main-header/app-bar';
import SubApp from '../../ux-editor/src/SubApp';
import NavigationActionDispatcher from './actions/navigationActions/navigationActionDispatcher';
import './App.css';

import { HashRouter as Router, Redirect, Route } from 'react-router-dom';
import altinnTheme from '../../shared/src/theme/altinnStudioTheme';

const DummySubApp = (name: any) => {
  return (
    <div>Dummy app for {name.name}</div>
  );
};

export interface IAppProps { }

export interface IAppProps extends WithStyles<typeof styles> { }

const styles = ({
  subApp: {
    [altinnTheme.breakpoints.up('md')]: {
      paddingLeft: 100,
    },
  },
});

class AppClass extends React.Component<IAppProps, any> {

  public handleDrawerToggle = () => {
    NavigationActionDispatcher.toggleDrawer();
  }

  public render() {
    const { classes } = this.props;
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    // const { org, service, instanceId, reportee } = altinnWindow;

    const redirects = [
      {
        from: '/',
        to: '/about',
      },
    ];

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
        <MuiThemeProvider theme={altinnTheme}>
          <Router>
            <Grid container={true} direction='column'>
              <Grid item={true} xs={12}>
                {redirects.map((route, index) => (
                  <Route
                    exact={true}
                    path={route.from}
                    render={() => (
                      <Redirect to={route.to} />
                    )}
                  />
                ))}
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
                      activeLeftMenuSelection={route.activeLeftMenuSelection}
                    />}
                  />
                ))}
              </Grid>
              <Grid item={true} xs={12}>
                <Hidden smDown>
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
                </Hidden>
                <div className={classes.subApp}>
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
        </MuiThemeProvider>
      </React.Fragment>
    );
  }
}

const mapsStateToProps = (state: IServiceDevelopmentAppState): any => ({});

const App = connect(mapsStateToProps)(AppClass);
export default withStyles(styles, { withTheme: true })(App);
