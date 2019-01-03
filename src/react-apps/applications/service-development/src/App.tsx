/* tslint:disable:jsx-no-lambda */
// https://github.com/facebook/create-react-app/issues/4801#issuecomment-409553780
// Disabled for React Router rendering

/* tslint:disable:jsx-boolean-value */
// Extensive used in Material-UI's Grid

import Grid from '@material-ui/core/Grid';
import Hidden from '@material-ui/core/Hidden';
import { createMuiTheme, createStyles, MuiThemeProvider, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import { HashRouter as Router, Redirect, Route } from 'react-router-dom';
import LeftDrawerMenu from '../../shared/src/navigation/drawer/LeftDrawerMenu';
import AppBarComponent from '../../shared/src/navigation/main-header/appBar';
import altinnTheme from '../../shared/src/theme/altinnStudioTheme';
import NavigationActionDispatcher from './actions/navigationActions/navigationActionDispatcher';
import './App.css';
import { redirects } from './config/redirects';
import { routes } from './config/routes';
import { IServiceDevelopmentState } from './reducers/serviceDevelopmentReducer';
import fetchLanguageDispatcher from './utils/fetchLanguage/fetchLanguageDispatcher';

import HandleMergeConflict from './features/mergeConflict/HandleMergeConflictContainer';

// import * as networking from '../../../applications/shared/src/utils/networking';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  container: {
    backgroundColor: theme.altinnPalette.primary.greyLight,
    height: '100%',
    width: '100%',
  },
  subApp: {
    [theme.breakpoints.up('md')]: {
      paddingLeft: 73,
    },
    height: '100%',
    width: '100%',
  },
});

export interface IServiceDevelopmentProps extends WithStyles<typeof styles> { }
export interface IServiceDevelopmentState {
  initialCheckComplete: boolean;
  mergeConflict: boolean;
}

class App extends React.Component<IServiceDevelopmentProps, IServiceDevelopmentState> {
  constructor(_props: IServiceDevelopmentProps) {
    super(_props);
    this.state = {
      initialCheckComplete: false,
      mergeConflict: null,
    };
  }

  public checkForMergeConflict = () => {
    console.log('checkForMergeConflict');

    const mockMergeStatus = {
      behindBy: 1,
      aheadBy: 2,
      contentStatus: [
        {
          filePath: 'Resources/FormLayout.json',
          fileStatus: 'ModifiedInWorkdir',
        },
      ],
      repositoryStatus: 'Ok',
    };

    // mock data
    setTimeout(() => {
      this.setState(
        {
          initialCheckComplete: true,
          mergeConflict: true,
        },
      );
    }, 1000);
  }

  public componentDidMount() {
    const altinnWindow: Window = window;
    fetchLanguageDispatcher.fetchLanguage(
      `${altinnWindow.location.origin}/designerapi/Language/GetLanguageAsJSON`, 'nb');
  }

  public handleDrawerToggle = () => {
    NavigationActionDispatcher.toggleDrawer();
  }

  public componentDidMount() {
    this.checkForMergeConflict();
  }

  public render() {
    const { classes } = this.props;
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;

    return (
      <React.Fragment>
        <MuiThemeProvider theme={theme}>
          <Router>
            <div className={classes.container}>
              <Grid container={true} direction='row' id='test'>
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
                        showBreadcrumbOnTablet={true}
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
                            activeLeftMenuSelection={route.activeLeftMenuSelection}
                          />}
                        />
                      ))}
                    </div>
                  </Hidden>
                  {this.state.initialCheckComplete === true &&
                    this.state.mergeConflict === false ?
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
                    :
                    null
                  }
                  {this.state.mergeConflict === true ?
                    <div className={classes.subApp}>
                      <HandleMergeConflict
                        checkForMergeConflict={this.checkForMergeConflict}
                      />
                    </div>
                    :
                    null
                  }
                </Grid>
              </Grid>
            </div>
          </Router>
        </MuiThemeProvider>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (
  state: IServiceDevelopmentState,
) => {
  return {
  };
};

export default withStyles(styles)(connect(mapStateToProps)(App));
