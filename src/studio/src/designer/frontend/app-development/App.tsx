import { Grid, Typography } from '@material-ui/core';
import { createTheme, MuiThemeProvider, makeStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { HashRouter as Router } from 'react-router-dom';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import postMessages from 'app-shared/utils/postMessages';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { DataModelsMetadataActions } from 'app-shared/features/dataModelling/sagas/metadata';
import { HandleServiceInformationActions } from './features/administration/handleServiceInformationSlice';
import { fetchRepoStatus } from './features/handleMergeConflict/handleMergeConflictSlice';
import { makeGetRepoStatusSelector } from './features/handleMergeConflict/handleMergeConflictSelectors';
import { ApplicationMetadataActions } from './sharedResources/applicationMetadata/applicationMetadataSlice';
import { fetchLanguage } from './utils/fetchLanguage/languageSlice';
import { repoStatusUrl } from './utils/urlHelper';
import { fetchRemainingSession, keepAliveSession, signOutUser } from './sharedResources/user/userSlice';
import LeftMenu from './layout/LeftMenu';
import PageHeader from './layout/PageHeader';
import { useAppDispatch, useAppSelector } from 'common/hooks';

import './App.css';

const theme = createTheme(altinnTheme);

const useStyles = makeStyles({
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

const GetRepoStatusSelector = makeGetRepoStatusSelector();
const TEN_MINUTE_IN_MILLISECONDS = 60000 * 10;

export function App() {
  const language = useAppSelector(state => state.languageState.language);
  const repoStatus = useAppSelector(GetRepoStatusSelector);
  const remainingSessionMinutes = useAppSelector(state => state.userState.session.remainingMinutes);
  const dispatch = useAppDispatch();
  const classes = useStyles();
  const [lastKeepAliveTimestamp, setLastKeepAliveTimestamp] = React.useState<number>(0);
  const sessionExpiredPopoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const { org, app } = window as Window as IAltinnWindow;
    dispatch(fetchLanguage({
      url: `${window.location.origin}/designerapi/Language/GetLanguageAsJSON`,
      languageCode: 'nb',
    }));
    dispatch(HandleServiceInformationActions.fetchServiceName({
      url: `${window.location.origin}/designer/${org}/${app}/Text/GetServiceName`,
    }));
    dispatch(ApplicationMetadataActions.getApplicationMetadata());
    dispatch(DataModelsMetadataActions.getDataModelsMetadata());
    dispatch(fetchRemainingSession());
    dispatch(HandleServiceInformationActions.fetchService(
      { url: `${window.location.origin}/designer/api/v1/repos/${org}/${app}` },
    ));
    dispatch(HandleServiceInformationActions.fetchInitialCommit(
      { url: `${window.location.origin}/designer/api/v1/repos/${org}/${app}/initialcommit` },
    ));
    dispatch(HandleServiceInformationActions.fetchServiceConfig(
      { url: `${window.location.origin}/designer/${org}/${app}/Config/GetServiceConfig` },
    ));
  }, [dispatch]);

  React.useEffect(() => {
    const setEventListeners = (subscribe: boolean) => {
      const keepAliveListeners = ['mousemove', 'scroll', 'onfocus', 'keydown'];
      keepAliveListeners.forEach((listener) => (subscribe ? window.addEventListener : window.removeEventListener)(
        listener, keepAliveSessionState,
      ));
    }
    const windowEventReceived = (event: any) => {
      if (event.data === postMessages.forceRepoStatusCheck) {
        checkForMergeConflict();
      }
    }
    const keepAliveSessionState = () => {
      const timeNow = Date.now();

      if (
        (remainingSessionMinutes > 10) &&
        (remainingSessionMinutes <= 30) &&
        ((timeNow - lastKeepAliveTimestamp) > TEN_MINUTE_IN_MILLISECONDS)) {
        setLastKeepAliveTimestamp(timeNow);
        dispatch((keepAliveSession()));
      }
    }
    const checkForMergeConflict = () => {
      const { org, app } = window as Window as IAltinnWindow;
      dispatch(fetchRepoStatus({
        url: repoStatusUrl,
        org,
        repo: app,
      }));
    }

    setEventListeners(true);
    window.addEventListener('message', windowEventReceived);
    return function cleanup() {
      window.removeEventListener('message', windowEventReceived);
      setEventListeners(false);
    }
  }, [dispatch, lastKeepAliveTimestamp, remainingSessionMinutes]);


  const handleSessionExpiresClose = React.useCallback((action: string) => {
    if (action === 'close') {
      // user clicked close button, sign user out
      dispatch(signOutUser());
    } else {
      // user clicked outside the popover or pressed "continue", keep signed in
      dispatch(keepAliveSession());
      setLastKeepAliveTimestamp(Date.now());
    }
  }, [dispatch]);
  
  return (
    <MuiThemeProvider theme={theme}>
      <Router>
        <div className={classes.container} ref={sessionExpiredPopoverRef}>
          <AltinnPopoverSimple
            anchorEl={(remainingSessionMinutes < 11) ? sessionExpiredPopoverRef.current : null}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            handleClose={(event: string) => handleSessionExpiresClose(event)}
            btnCancelText={getLanguageFromKey('general.sign_out', language)}
            btnConfirmText={getLanguageFromKey('general.continue', language)}
            btnClick={handleSessionExpiresClose}
            paperProps={{ style: { margin: '2.4rem' } }}
          >
            <Typography variant='h2'>
              {getLanguageFromKey('session.expires', language)}
            </Typography>
            <Typography variant='body1' style={{ marginTop: '1.6rem' }}>
              {getLanguageFromKey('session.inactive', language)}
            </Typography>
          </AltinnPopoverSimple>
          <Grid container={true} direction='row'>
            <PageHeader repoStatus={repoStatus} />
            <LeftMenu
              repoStatus={repoStatus}
              classes={classes}
              language={language}
            />
          </Grid>
        </div>
      </Router>
    </MuiThemeProvider>
  );
}

export default App;
