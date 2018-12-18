/* tslint:disable:jsx-no-lambda */
// https://github.com/facebook/create-react-app/issues/4801#issuecomment-409553780
// Disabled for React Router rendering

/* tslint:disable:jsx-boolean-value */
// Extensive used in Material-UI's Grid

import Grid from '@material-ui/core/Grid';
import Hidden from '@material-ui/core/Hidden';
import { createMuiTheme, createStyles, MuiThemeProvider, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { HashRouter as Router, Redirect, Route } from 'react-router-dom';
import LeftDrawerMenu from '../../shared/src/navigation/drawer/LeftDrawerMenu';
import AppBarComponent from '../../shared/src/navigation/main-header/appBar';
import altinnTheme from '../../shared/src/theme/altinnStudioTheme';
import NavigationActionDispatcher from './actions/navigationActions/navigationActionDispatcher';
import './App.css';
import { redirects } from './config/redirects';
import { routes } from './config/routes';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  subApp: {
    [theme.breakpoints.up('md')]: {
      paddingLeft: 100,
    },
  },
});

class App extends React.Component<WithStyles<typeof styles>, any> {

  public handleDrawerToggle = () => {
    NavigationActionDispatcher.toggleDrawer();
  }

  public render() {
    const { classes } = this.props;
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;

    return (
      <React.Fragment>
        <MuiThemeProvider theme={theme}>
          <Router>
            <Grid container={true} direction='row'>
              <Grid item={true} xs={12}>
                {redirects.map((route, index) => (
                  <Route
                    key={index}
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
                      backgroundColor={theme.altinnPalette.primary.white}
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
                          activeLeftMenuSelection={route.activeLeftMenuSelection}
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
                      exact={route.exact}
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

export default withStyles(styles)(App);
