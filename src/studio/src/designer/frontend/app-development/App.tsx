/* eslint-disable react/jsx-props-no-spreading */
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
import { compose, Dispatch } from 'redux';
import LeftDrawerMenu from 'app-shared/navigation/drawer/LeftDrawerMenu';
import AppBarComponent from 'app-shared/navigation/main-header/appBar';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import postMessages from 'app-shared/utils/postMessages';
import NavigationActionDispatcher from './actions/navigationActions/navigationActionDispatcher';
import './App.css';
import { redirects } from './config/redirects';
import routes from './config/routes';
import { HandleServiceInformationActions } from './features/administration/handleServiceInformationSlice';
import HandleMergeConflict from './features/handleMergeConflict/HandleMergeConflictContainer';
import { fetchRepoStatus } from './features/handleMergeConflict/handleMergeConflictSlice';
import { makeGetRepoStatusSelector } from './features/handleMergeConflict/handleMergeConflictSelectors';
import { ApplicationMetadataActions } from './sharedResources/applicationMetadata/applicationMetadataSlice';
import { fetchLanguage } from './utils/fetchLanguage/languageSlice';
import { getRepoStatusUrl } from './utils/urlHelper';
import { fetchRemainingSession, keepAliveSession, signOutUser } from './sharedResources/user/userSlice';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import { Typography } from '@material-ui/core';
import { getLanguageFromKey } from 'app-shared/utils/language';

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
    [theme.breakpoints.up('xs')]: {
      paddingTop: '55px',
    },
    [theme.breakpoints.up('md')]: {
      paddingTop: '111px',
    },
    background: theme.altinnPalette.primary.greyLight,
    height: '100%',
    width: '100%',
  },
});

export interface IServiceDevelopmentProvidedProps {
  dispatch?: Dispatch;
}

export interface IServiceDevelopmentProps extends WithStyles<typeof styles>, IServiceDevelopmentProvidedProps {
  language: any;
  location: any;
  repoStatus: any;
  serviceName: any;
  remainingSessionMinutes: number;
}
export interface IServiceDevelopmentAppState {
  forceRepoStatusCheckComplete: boolean;
  sessionExpiredPopoverRef: React.RefObject<HTMLDivElement>;
  remainingSessionMinutes: number;
  lastKeepAliveTimestamp: number;
}

const TEN_MINUTE_IN_MILLISECONDS: number = 60000 * 10;

class App extends React.Component<IServiceDevelopmentProps, IServiceDevelopmentAppState, RouteChildrenProps> {
  constructor(_props: IServiceDevelopmentProps, _state: IServiceDevelopmentAppState) {
    super(_props, _state);
    this.state = {
      forceRepoStatusCheckComplete: true,
      sessionExpiredPopoverRef: React.createRef<HTMLDivElement>(),
      remainingSessionMinutes: _props.remainingSessionMinutes,
      lastKeepAliveTimestamp: 0,
    };
  }

  public componentDidUpdate(_prevProps: IServiceDevelopmentProps) {
    if (_prevProps.remainingSessionMinutes != this.props.remainingSessionMinutes) {
      this.setState(_x => ({
        remainingSessionMinutes: this.props.remainingSessionMinutes,
      }));
      return true;
    }
    return false;
  }

  public componentDidMount() {
    const { org, app } = window as Window as IAltinnWindow;
    this.props.dispatch(fetchLanguage({
      url: `${window.location.origin}/designerapi/Language/GetLanguageAsJSON`,
      languageCode: 'nb',
    }));
    this.props.dispatch(HandleServiceInformationActions.fetchServiceName({
      url: `${window.location.origin}/designer/${org}/${app}/Text/GetServiceName`,
    }));
    this.props.dispatch(ApplicationMetadataActions.getApplicationMetadata());
    this.props.dispatch(fetchRemainingSession());
    this.checkForMergeConflict();
    this.setUpEventListeners();
    window.addEventListener('message', this.windowEventReceived);
  }

  public componentWillUnmount() {
    window.removeEventListener('message', this.windowEventReceived);
    this.removeEventListeners();
  }

  public checkForMergeConflict = () => {
    const { org, app } = window as Window as IAltinnWindow;
    const repoStatusUrl = getRepoStatusUrl();

    this.props.dispatch(fetchRepoStatus({
      url: repoStatusUrl,
      org,
      repo: app,
    }));
  }

  public keepAliveSession = () => {
    const timeNow = Date.now();
    if ((this.state.remainingSessionMinutes > 10) && ((timeNow - this.state.lastKeepAliveTimestamp) > TEN_MINUTE_IN_MILLISECONDS)) {
      this.setState(_x => ({
        lastKeepAliveTimestamp: timeNow,
      }));
      this.props.dispatch((keepAliveSession()));
    }
  }

  public setUpEventListeners = () => {
    window.addEventListener('mousemove', this.keepAliveSession);
    window.addEventListener('scroll', this.keepAliveSession);
    window.addEventListener('onfocus', this.keepAliveSession);
    window.addEventListener('keydown', this.keepAliveSession);
  }

  public removeEventListeners = () => {
    window.removeEventListener('mousemove', this.keepAliveSession);
    window.removeEventListener('scroll', this.keepAliveSession);
    window.removeEventListener('onfocus', this.keepAliveSession);
    window.removeEventListener('keydown', this.keepAliveSession);
  }

  public windowEventReceived = (event: any) => {
    if (event.data === postMessages.forceRepoStatusCheck) {
      this.checkForMergeConflict();
    }
  }

  public handleDrawerToggle = () => {
    NavigationActionDispatcher.toggleDrawer();
  }

  public handleSessionExpiresClose = (action: string) => {
    if (action === 'close') {
      // user clicked close button, sign user out
      this.props.dispatch(signOutUser());
    } else {
      // user clicked outside the popover or pressed "continue", keep signed in
      this.props.dispatch(keepAliveSession());
      this.setState(_x => ({
        lastKeepAliveTimestamp: Date.now(),
      }));
    }
  }

  public render() {
    const { classes, repoStatus } = this.props;
    const { org, app } = window as Window as IAltinnWindow;

    return (
      <React.Fragment>
        <MuiThemeProvider theme={theme}>
          <Router>
            <div className={classes.container} ref={this.state.sessionExpiredPopoverRef}>
            <AltinnPopoverSimple
              anchorEl={(this.state.remainingSessionMinutes < 11) ? this.state.sessionExpiredPopoverRef : null}
              anchorOrigin={{vertical: 'top', horizontal: 'center'}}
              transformOrigin={{vertical: 'top', horizontal: 'center'}}
              handleClose={(event: string) => this.handleSessionExpiresClose(event)}
              btnCancelText={getLanguageFromKey('general.sign_out', this.props.language)}
              btnConfirmText={getLanguageFromKey('general.continue', this.props.language)}
              btnClick={this.handleSessionExpiresClose}
              paperProps={{ style: { margin: '2.4rem' }}}
              children={
                <>
                  <Typography variant={'h2'}>
                    {getLanguageFromKey('session.expires', this.props.language)}
                  </Typography>
                  <Typography variant={'body1'} style={{ marginTop: '1.6rem'} }>
                    {getLanguageFromKey('session.inactive', this.props.language)}
                  </Typography>
                </>
              }
              />
              <Grid container={true} direction='row'>
                <Grid item={true} xs={12}>
                  {repoStatus.hasMergeConflict !== true ?
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
                        // eslint-disable-next-line react/jsx-props-no-spreading
                        {...props}
                        activeLeftMenuSelection={route.activeLeftMenuSelection}
                        activeSubHeaderSelection={route.activeSubHeaderSelection}
                        logoutButton={repoStatus.hasMergeConflict}
                        org={org}
                        app={app}
                        showBreadcrumbOnTablet={true}
                        showSubHeader={!repoStatus.hasMergeConflict}
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
    props: IServiceDevelopmentProvidedProps,
  ) => {
    return {
      repoStatus: GetRepoStatusSelector(state),
      language: state.languageState.language,
      serviceName: state.serviceInformation.serviceNameObj ? state.serviceInformation.serviceNameObj.name : '',
      dispatch: props.dispatch,
      remainingSessionMinutes: state.userState.session.remainingMinutes,
    };
  };
  return mapStateToProps;
};

export default compose(
  withRouter,
  withStyles(styles),
  connect(makeMapStateToProps),
)(App);
