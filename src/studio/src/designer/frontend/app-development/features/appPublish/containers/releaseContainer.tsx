import {
  CircularProgress,
  createMuiTheme,
  createStyles,
  Grid,
  Hidden,
  Popover,
  Tab,
  Tabs,
  Typography,
  withStyles,
  WithStyles
} from '@material-ui/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AltinnIcon from 'app-shared/components/AltinnIcon';
import AltinnStudioTheme from 'app-shared/theme/altinnStudioTheme';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'app-shared/utils/language';
import { AppReleaseActions, IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseSlice';
import { BuildResult, BuildStatus, IRelease } from '../../../sharedResources/appRelease/types';
import { IRepoStatusState, RepoStatusActions } from '../../../sharedResources/repoStatus/repoStatusSlice';
import { fetchLanguage } from '../../../utils/fetchLanguage/languageSlice';
import { getGitCommitLink, repoStatusUrl, languageUrl } from '../../../utils/urlHelper';
import { fetchRepoStatus, IHandleMergeConflictState } from '../../handleMergeConflict/handleMergeConflictSlice';
import ReleaseComponent from '../components/appReleaseComponent';
import CreateReleaseComponent from '../components/createAppReleaseComponent';

interface IStyledTabsProps {
  value: number;
  onChange: (event: React.ChangeEvent<{}>, newValue: number) => void;
}

const theme = createMuiTheme(AltinnStudioTheme);

const StyledTabs = withStyles(createStyles({
  scroller: {
    maxHeight: '3.7rem',
  },
  indicator: {
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    textTransform: 'none',
    minHeight: 0,
    '& > div': {
      width: '70%',
      borderBottom: `2px solid ${theme.altinnPalette.primary.blue}`,
    },
  },
  flexContainer: {
    borderBottom: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
  },
  // eslint-disable-next-line react/jsx-props-no-spreading
}))((props: IStyledTabsProps) => <Tabs {...props} TabIndicatorProps={{ children: <div /> }} />);

const StyledTab = withStyles(createStyles({
  root: {
    minHeight: 0,
    textTransform: 'none',
    width: 'wrap',
    '&:focus': {
      outline: 0,
      color: theme.altinnPalette.primary.blue,
    },
    paddingBottom: 0,
    paddingLeft: '1.8rem',
    paddingRight: '1.8rem',
    minWidth: 0,
  },
  wrapper: {
    fontSize: '1.6rem',
  },
}))(Tab);

const styles = createStyles({
  appReleaseWrapper: {
    maxWidth: '78.6rem',
    minWidth: '24.6rem',
    background: 'white',
    borderLeft: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
    borderBottom: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
    display: 'flex',
    [theme.breakpoints.up('xs')]: {
      height: 'calc(100vh - 55px)',
    },
    [theme.breakpoints.up('md')]: {
      height: 'calc(100vh - 111px)',
    },
    flexGrow: 1,
    overflowX: 'hidden',
    overflowY: 'scroll',
  },
  appReleaseCreateRelease: {
    flexGrow: 1,
  },
  appReleaseHistory: {
    overflowY: 'scroll',
  },
  appReleaseHistoryTitle: {
    fontSize: '1.8rem',
    fontWeight: 500,
    padding: '2rem 1.2rem 2rem 1.2rem',
  },
  appCreateReleaseWrapper: {
    minHeight: '400px',
  },
  appCreateReleaseTitle: {
    padding: '1.2rem',
    fontWeight: 500,
    fontSize: '1.8rem',
  },
  appCreateReleaseStatusIcon: {
    paddingTop: '1.2rem',
    color: theme.altinnPalette.primary.blue,
    height: '48px',
    width: '48px',
  },
  popover: {
    pointerEvents: 'none',
  },
  popoverPaper: {
    padding: '2rem',
    maxWidth: '50rem',
    backgroundColor: theme.altinnPalette.primary.yellowLight,
  },
  cannotCreateReleaseContainer: {
    margin: '1.2rem',
    backgroundColor: theme.altinnPalette.primary.redLight,
    height: '100%',
  },
  cannotCreateReleaseTitle: {
    padding: '1.2rem',
  },
  cannotCreateReleaseSubTitle: {
    padding: '1.2rem',
    fontSize: '1.4rem',
  },
  renderCannotCreateReleaseIcon: {
    paddingTop: '2rem',
  },
});

export interface IAppReleaseContainer extends WithStyles<typeof styles> { }

function AppReleaseContainer(props: IAppReleaseContainer) {
  const { classes } = props;
  const dispatch = useDispatch();

  const [tabIndex, setTabIndex] = React.useState(0);
  const [anchorElement, setAchorElement] = React.useState<Element>();

  const [popoverOpenClick, setPopoverOpenClick] = React.useState<boolean>(false);
  const [popoverOpenHover, setPopoverOpenHover] = React.useState<boolean>(false);

  const appReleases: IAppReleaseState = useSelector((state: IServiceDevelopmentState) => state.appReleases);
  const repoStatus: IRepoStatusState = useSelector((state: IServiceDevelopmentState) => state.repoStatus);
  const handleMergeConflict: IHandleMergeConflictState =
    useSelector((state: IServiceDevelopmentState) => state.handleMergeConflict);
  const language: any = useSelector((state: IServiceDevelopmentState) => state.languageState.language);

  React.useEffect(() => {
    const { org, app } = window as Window as IAltinnWindow;
    dispatch(AppReleaseActions.getAppReleaseStartInterval());
    if (!language) {
      dispatch(fetchLanguage({ url: languageUrl, languageCode: 'nb' }));
    }
    dispatch(RepoStatusActions.getMasterRepoStatus({ org, repo: app }));
    dispatch(fetchRepoStatus({
      url: repoStatusUrl,
      org,
      repo: app,
    }));
    return () => {
      dispatch(AppReleaseActions.getAppReleaseStopInterval());
    };
  }, []);

  function handleChangeTabIndex(event: React.ChangeEvent<{}>, value: number) {
    setTabIndex(value);
  }

  function handlePopoverKeyPress(event: React.KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      if (!anchorElement) {
        setAchorElement(event.currentTarget);
      }
      setPopoverOpenClick(!popoverOpenClick);
    }
  }

  function handlePopoverOpenClicked(event: React.MouseEvent) {
    if (!anchorElement) {
      setAchorElement(event.currentTarget);
    }
    setPopoverOpenClick(!popoverOpenClick);
  }

  function handlePopoverOpenHover(event: React.MouseEvent) {
    setAchorElement(event.currentTarget);
    setPopoverOpenHover(true);
  }

  function handlePopoverClose() {
    if (popoverOpenHover) {
      setPopoverOpenHover(!popoverOpenHover);
    }
  }

  function renderCannotCreateRelease() {
    return (
      <Grid
        container={true}
        direction='row'
        className={classes.cannotCreateReleaseContainer}
        spacing={1}
      >
        <Hidden
          mdDown={true}
        >
          <Grid
            item={true}
            xs={1}
          >
            <AltinnIcon
              iconClass={`${classes.renderCannotCreateReleaseIcon} ai ai-circle-exclamation`}
              iconColor={theme.altinnPalette.primary.red}
            />
          </Grid>
        </Hidden>
        <Grid
          item={true}
          xs={12}
          md={10}
        >
          <Grid
            container={true}
            direction='column'
          >
            <Typography
              className={classes.cannotCreateReleaseTitle}
            >
              {getParsedLanguageFromKey(
                'app_create_release_errors.fetch_release_failed',
                language,
                ['mailto:tjenesteeier@altinn.no'],
              )}
            </Typography>
            <Typography
              className={classes.cannotCreateReleaseSubTitle}
            >
              {getLanguageFromKey('app_create_release_errors.technical_error_code', language)}
              &nbsp;
              {appReleases.errors.fetchReleaseErrorCode}
            </Typography>
          </Grid>

        </Grid>

      </Grid>
    );
  }

  function renderCreateRelease() {
    if (appReleases.errors.fetchReleaseErrorCode !== null) {
      return renderCannotCreateRelease();
    }
    if (!repoStatus.branch.master || !handleMergeConflict.repoStatus.contentStatus) {
      return (
        <Grid
          container={true}
          direction='row'
          justify='center'
        >
          <Grid
            container={true}
            direction='row'
            justify='center'
          >
            <Grid
              container={true}
              direction='column'
              justify='space-evenly'
              style={{
                padding: '2rem',
              }}
            >
              <Grid item={true}>
                <CircularProgress
                  style={{
                    color: theme.altinnPalette.primary.blue,
                  }}
                />
              </Grid>
              <Grid item={true}>
                <Typography
                  style={{
                    padding: '1.2rem',
                  }}
                >
                  {getLanguageFromKey('app_create_release.check_status', language)}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      );
    }
    if (appReleases.errors.fetchReleaseErrorCode !== null) {
      return null;
    }
    if (!appReleases.releases || !appReleases.releases.length) {
      return (
        <CreateReleaseComponent />
      );
    }
    if (
      !handleMergeConflict.repoStatus ||
      !repoStatus.branch.master
    ) {
      return null;
    }
    // Check if latest
    if (
      !!appReleases.releases[0] &&
      appReleases.releases[0].targetCommitish === repoStatus.branch.master.commit.id &&
      (appReleases.releases[0].build.status === BuildStatus.completed &&
        appReleases.releases[0].build.result === BuildResult.succeeded)
    ) {
      return null;
    }
    if (appReleases.releases[0].build.status !== BuildStatus.completed) {
      return null;
    }
    return (
      <CreateReleaseComponent />
    );
  }

  function renderStatusIcon() {
    if (
      !repoStatus.branch.master ||
      !handleMergeConflict.repoStatus.contentStatus ||
      !handleMergeConflict.repoStatus.contentStatus.length ||
      !appReleases.releases.length
    ) {
      return null;
    }
    if (
      !!handleMergeConflict.repoStatus.contentStatus ||
      !!handleMergeConflict.repoStatus.aheadBy
    ) {
      return (
        <i
          className='fa fa-circle-upload'
        />
      );
    }
    return null;
  }

  function renderStatusMessage() {
    if (
      // eslint-disable-next-line no-extra-boolean-cast
      !!!repoStatus.branch.master || !!!appReleases.releases || !!!handleMergeConflict.repoStatus.contentStatus
    ) {
      return null;
    }
    if (!appReleases.releases || !appReleases.releases.length) {
      return null;
    }
    if (
      !!appReleases.releases[0] &&
      repoStatus.branch.master.commit.id === appReleases.releases[0].targetCommitish
    ) {
      return (
        <Typography>
          {getLanguageFromKey('app_create_release.local_changes_cant_build', language)}
        </Typography>
      );
    }
    // eslint-disable-next-line no-extra-boolean-cast
    if (!!handleMergeConflict.repoStatus.contentStatus) {
      return (
        <Typography>
          {getLanguageFromKey('app_create_release.local_changes_can_build', language)}
        </Typography>
      );
    }
    return null;
  }

  function renderCreateReleaseTitle() {
    if (
      !!appReleases.errors.fetchReleaseErrorCode ||
      !repoStatus.branch.master ||
      !handleMergeConflict.repoStatus.contentStatus
    ) {
      return null;
    }
    // eslint-disable-next-line no-extra-boolean-cast
    const latestRelease: IRelease = !!appReleases.releases[0] ? appReleases.releases[0] : null;
    if (
      !latestRelease ||
      (latestRelease.targetCommitish !== repoStatus.branch.master.commit.id) ||
      // eslint-disable-next-line no-extra-boolean-cast
      !!!handleMergeConflict.repoStatus.contentStatus
    ) {
      return (
        <Typography>
          {getLanguageFromKey('app_release.release_title', language)} &nbsp;
          { /* eslint-disable-next-line no-extra-boolean-cast */}
          {!!repoStatus.branch.master ?
            <a
              href={getGitCommitLink(repoStatus.branch.master.commit.id)}
              target='_blank'
              rel='noopener noreferrer'
            >
              {getLanguageFromKey('app_release.release_title_link', language)}
            </a> :
            null
          }
        </Typography>
      );
    }
    if (latestRelease.targetCommitish === repoStatus.branch.master.commit.id) {
      return (
        <>
          {getLanguageFromKey('general.version', language)}
          &nbsp;
          {appReleases.releases[0].tagName}
          &nbsp;
          {getLanguageFromKey('general.contains', language)}
          &nbsp;
          <a href={getGitCommitLink(repoStatus.branch.master.commit.id)}>
            {getLanguageFromKey('app_release.release_title_link', language)}
          </a>
        </>
      );
    }
    return null;
  }

  return (
    <>
      <Grid
        container={true}
        direction='row'
        className={classes.appReleaseWrapper}
      >
        <Grid
          container={true}
          direction='column'
        >
          <Grid
            item={true}
          >
            <StyledTabs value={tabIndex} onChange={handleChangeTabIndex}>
              <StyledTab
                label={getLanguageFromKey('app_release.release_tab_versions', language)}
              />
            </StyledTabs>
          </Grid>

          <Grid
            container={true}
            direction='column'
            className={classes.appCreateReleaseWrapper}
          >
            <Grid
              container={true}
              direction='row'
              justify='space-between'
            >
              <Grid
                item={true}
                xs={10}
              >
                <Typography className={classes.appCreateReleaseTitle}>
                  {renderCreateReleaseTitle()}
                </Typography>
              </Grid>
              <Grid
                item={true}
                className={classes.appCreateReleaseStatusIcon}
                onClick={handlePopoverOpenClicked}
                onMouseOver={handlePopoverOpenHover}
                onMouseLeave={handlePopoverClose}
                tabIndex={0}
                onKeyPress={handlePopoverKeyPress}
                xs={1}
              >
                {renderStatusIcon()}
              </Grid>
            </Grid>
            <Grid
              item={true}
              className={classes.appReleaseCreateRelease}
            >
              {renderCreateRelease()}
            </Grid>
          </Grid>
          <Grid
            item={true}
          >
            <Typography
              className={classes.appReleaseHistoryTitle}
            >
              {getLanguageFromKey('app_release.earlier_releases', language)}
            </Typography>
          </Grid>
          <Grid
            container={true}
            className={classes.appReleaseHistory}
          >
            {!!appReleases.releases.length &&
              appReleases.releases.map((release: IRelease, index: number) => (
                // eslint-disable-next-line react/no-array-index-key
                <ReleaseComponent key={index} release={release} />
              ))}
          </Grid>
        </Grid>
      </Grid>
      <Popover
        className={classes.popover}
        classes={{
          paper: classes.popoverPaper,
        }}
        anchorEl={anchorElement}
        open={(popoverOpenClick || popoverOpenHover)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        onClose={handlePopoverClose}
      >
        {renderStatusMessage()}
      </Popover>
    </>
  );
}

export default withStyles(styles)(AppReleaseContainer);
