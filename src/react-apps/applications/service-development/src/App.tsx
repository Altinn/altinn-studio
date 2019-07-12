/* tslint:disable:jsx-no-lambda */
// https://github.com/facebook/create-react-app/issues/4801#issuecomment-409553780
// Disabled for React Router rendering

/* tslint:disable:jsx-boolean-value */
// Extensive used in Material-UI's Grid

import Grid from '@material-ui/core/Grid';
import Hidden from '@material-ui/core/Hidden';
import { createMuiTheme, createStyles, MuiThemeProvider, withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import { RouteChildrenProps } from 'react-router';
import { HashRouter as Router, Redirect, Route, Switch, withRouter } from 'react-router-dom';
import { compose } from 'redux';
import LeftDrawerMenu from '../../shared/src/navigation/drawer/LeftDrawerMenu';
import AppBarComponent from '../../shared/src/navigation/main-header/appBar';
import altinnTheme from '../../shared/src/theme/altinnStudioTheme';
import postMessages from '../../shared/src/utils/postMessages';
import NavigationActionDispatcher from './actions/navigationActions/navigationActionDispatcher';
import './App.css';
import { redirects } from './config/redirects';
import { routes } from './config/routes';
import handleServiceInformationActionDispatchers from './features/administration/handleServiceInformationDispatcher';
import HandleMergeConflict from './features/handleMergeConflict/HandleMergeConflictContainer';
import HandleMergeConflictDispatchers from './features/handleMergeConflict/handleMergeConflictDispatcher';
import { makeGetRepoStatusSelector } from './features/handleMergeConflict/handleMergeConflictSelectors';
import applicationMetadataDispatcher from './sharedResources/applicationMetadata/applicationMetadataDispatcher';
import fetchLanguageDispatcher from './utils/fetchLanguage/fetchLanguageDispatcher';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  container: {
    backgroundColor: theme.altinnPalette.primary.greyLight,
    height: '100%',
    width: '100%',
  },
  mergeConflictApp: {
    height: '100%',
    width: '100%',
  },
  subApp: {
    background: theme.altinnPalette.primary.greyLight,
    height: '100%',
    width: '100%',
  },
});

export interface IServiceDevelopmentProps extends WithStyles<typeof styles> {
  language: any;
  location: any;
  repoStatus: any;
  serviceName: any;
}
export interface IServiceDevelopmentAppState {
  forceRepoStatusCheckComplete: boolean;
}

class App extends React.Component<IServiceDevelopmentProps, IServiceDevelopmentAppState, RouteChildrenProps> {
  constructor(_props: IServiceDevelopmentProps, _state: IServiceDevelopmentAppState) {
    super(_props, _state);
    this.state = {
      forceRepoStatusCheckComplete: true,
    };
  }

  public checkForMergeConflict = () => {
    const altinnWindow: any = window;
    const { org, service } = altinnWindow;
    // tslint:disable-next-line:max-line-length
    const repoStatusUrl = `${altinnWindow.location.origin}/designerapi/Repository/RepoStatus?owner=${org}&repository=${service}`;

    HandleMergeConflictDispatchers.fetchRepoStatus(repoStatusUrl, org, service);
  }

  public componentDidMount() {
    const altinnWindow: any = window;
    const { org, service } = altinnWindow;
    fetchLanguageDispatcher.fetchLanguage(
      `${altinnWindow.location.origin}/designerapi/Language/GetLanguageAsJSON`, 'nb');
    handleServiceInformationActionDispatchers.fetchServiceName(
      `${altinnWindow.location.origin}/designer/${org}/${service}/Text/GetServiceName`);
    applicationMetadataDispatcher.getApplicationMetadata();

    this.checkForMergeConflict();
    window.addEventListener('message', this.windowEventReceived);
  }

  public componentWillUnmount() {
    window.removeEventListener('message', this.windowEventReceived);
  }

  public windowEventReceived = (event: any) => {
    if (event.data === postMessages.forceRepoStatusCheck) {
      this.checkForMergeConflict();
    }
  }

  public handleDrawerToggle = () => {
    NavigationActionDispatcher.toggleDrawer();
  }

  public render() {
    const { classes, repoStatus } = this.props;

    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;

    return (
      <React.Fragment>
        <MuiThemeProvider theme={theme}>
          <Router>
            <div className={classes.container}>
              <Grid container={true} direction='row'>
                <Grid item={true} xs={12}>
                  {repoStatus.hasMergeConflict === false ?
                    redirects.map((route, index) => (
                      <Route
                        key={index}
                        exact={true}
                        path={route.from}
                        render={() => (
                          <Redirect to={route.to} />
                        )}
                      />
                    ))
                    :
                    null
                  }
                  {routes.map((route, index) => (
                    <Route
                      key={index}
                      path={route.path}
                      exact={route.exact}
                      render={(props) => <AppBarComponent
                        {...props}
                        activeLeftMenuSelection={route.activeLeftMenuSelection}
                        activeSubHeaderSelection={route.activeSubHeaderSelection}
                        logoutButton={repoStatus.hasMergeConflict}
                        org={org}
                        service={this.props.serviceName || service}
                        showBreadcrumbOnTablet={true}
                        showSubHeader={repoStatus.hasMergeConflict ? false : true}
                      />}
                    />
                  ))}
                </Grid>
                <Grid item={true} xs={12}>
                  {
                    !repoStatus.hasMergeConflict ?
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
                      :
                      null
                  }

                  {
                    repoStatus.hasMergeConflict ?
                      <div
                        className={classNames({
                          [classes.mergeConflictApp]: repoStatus.hasMergeConflict,
                          [classes.subApp]: !repoStatus.hasMergeConflict,
                        })}
                      >
                        <Switch>
                          <Route
                            path='/mergeconflict'
                            exact={true}
                            component={HandleMergeConflict}
                          />
                          <Redirect to='/mergeconflict' />
                        </Switch>
                      </div>
                      :
                      <div className={classes.subApp}>
                        {routes.map((route, index) => (
                          <Route
                            key={index}
                            path={route.path}
                            exact={route.exact}
                            render={(props) => <route.subapp
                              {...props}
                              {...route.props}
                              name={route.path}
                              language={this.props.language}
                            />}
                          />
                        ))}
                      </div>
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

const makeMapStateToProps = () => {
  const GetRepoStatusSelector = makeGetRepoStatusSelector();
  const mapStateToProps = (
    state: IServiceDevelopmentState,
  ) => {
    return {
      repoStatus: GetRepoStatusSelector(state),
      language: state.language,
      serviceName: state.serviceInformation.serviceNameObj ? state.serviceInformation.serviceNameObj.name : '',
    };
  };
  return mapStateToProps;
};

export default compose(
  withRouter,
  withStyles(styles),
  connect(makeMapStateToProps),
)(App);
