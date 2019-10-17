import {
  CircularProgress,
  createStyles,
  Grid,
  Popover,
  Tab,
  Tabs,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import theme from '../../../../../shared/src/theme/altinnStudioTheme';
import AppReleaseActions from '../../../sharedResources/appRelease/appReleaseDispatcher';
import { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseReducer';
import { BuildResult, BuildStatus, IRelease } from '../../../sharedResources/appRelease/types';
import RepoStatusActionDispatchers from '../../../sharedResources/repoStatus/repoStatusDispatcher';
import { IRepoStatusState } from '../../../sharedResources/repoStatus/repoStatusReducer';
import { getRepoStatusUrl } from '../../../utils/urlHelper';
import HandleMergeConflictActionDispatchers from '../../handleMergeConflict/handleMergeConflictDispatcher';
import { IHandleMergeConflictState } from '../../handleMergeConflict/handleMergeConflictReducer';
import ReleaseComponent from '../components/appReleaseComponent';
import CreateReleaseComponent from '../components/createAppReleaseComponent';

interface IStyledTabsProps {
  value: number;
  onChange: (event: React.ChangeEvent<{}>, newValue: number) => void;
}

const StyledTabs = withStyles(createStyles({
  scroller: {
    maxHeight: '3.7rem',
  },
  indicator: {
    'display': 'flex',
    'justifyContent': 'center',
    'backgroundColor': 'transparent',
    'textTransform': 'none',
    'minHeight': 0,
    '& > div': {
      width: '70%',
      borderBottom: `2px solid ${theme.altinnPalette.primary.blue}`,
    },
  },
  flexContainer: {
    borderBottom: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
  },
}))((props: IStyledTabsProps) => <Tabs {...props} TabIndicatorProps={{ children: <div /> }} />);

const StyledTab = withStyles(createStyles({
  root: {
    'minHeight': 0,
    'textTransform': 'none',
    'width': 'wrap',
    '&:focus': {
      outline: 0,
      color: theme.altinnPalette.primary.blue,
    },
    'paddingBottom': 0,
    'paddingLeft': '1.8rem',
    'paddingRight': '1.8rem',
    'minWidth': 0,
  },
  wrapper: {
    fontSize: '1.6rem',
  },
}))(Tab);

const styles = createStyles({
  appReleaseWrapper: {
    background: 'white',
    borderLeft: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
    borderBottom: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  appReleaseTabs: {
    flexGrow: 1,
  },
  appReleaseCreateRelease: {
    flexGrow: 1,
  },
  appReleaseHistory: {
    flexGrow: 1,
    maxHeight: 500,
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
    padding: '1.2rem',
  },
  popover: {
    pointerEvents: 'none',
  },
  popoverPaper: {
    padding: '2rem',
    backgroundColor: theme.altinnPalette.primary.yellowLight,
  },
});

export interface IAppReleaseContainer extends WithStyles<typeof styles> { }

function AppReleaseContainer(props: IAppReleaseContainer) {
  const { classes } = props;
  const [tabIndex, setTabIndex] = React.useState(0);
  const [anchorElement, setAchorElement] = React.useState<Element>();

  const [popoverOpenClick, setPopoverOpenClick] = React.useState<boolean>(false);
  const [popoverOpenHover, setPopoverOpenHover] = React.useState<boolean>(false);

  const appReleases: IAppReleaseState = useSelector((state: IServiceDevelopmentState) => state.appReleases);
  const repoStatus: IRepoStatusState = useSelector((state: IServiceDevelopmentState) => state.repoStatus);
  const handleMergeConflict: IHandleMergeConflictState =
    useSelector((state: IServiceDevelopmentState) => state.handleMergeConflict);

  React.useEffect(() => {
    const { org, app } = window as Window as IAltinnWindow;
    if (!!!appReleases.releases.length) {
      AppReleaseActions.getAppReleases();
    }
    RepoStatusActionDispatchers.getMasterRepoStatus(org, app);
    HandleMergeConflictActionDispatchers.fetchRepoStatus(getRepoStatusUrl(), org, app);
  }, []);

  if (!appReleases.releases || !appReleases.releases.length) {
    return null;
  }

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

  function renderCreateRelease() {
    if (!repoStatus.branch.master || !handleMergeConflict.repoStatus.contentStatus) {
      return (
        <Grid
          container={true}
          direction={'column'}
          justify={'center'}
        >
          <Grid
            container={true}
            direction={'row'}
            justify={'center'}
          >
            <Grid
              container={true}
              direction={'column'}
              justify={'space-evenly'}
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
                  Checking repo startus
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      );
    }
    // Check if latest
    if (!!appReleases.releases.length && appReleases.releases[0].build.status === BuildStatus.inProgress) {
      return (
        <Grid
          container={true}
          direction={'column'}
          justify={'center'}
        >
          <Grid
            container={true}
            direction={'row'}
            justify={'center'}
          >
            You have an active build
          </Grid>
        </Grid>
      );
    }
    if (appReleases.releases[0].targetCommitish === repoStatus.branch.master.commit.id &&
      (appReleases.releases[0].build.result === BuildResult.succeeded) ||
      appReleases.releases[0].build.status !== BuildStatus.completed) {
      return null;
    }

    return (
      <CreateReleaseComponent />
    );
  }

  function renderStatusIcon() {
    if (!!!repoStatus.branch.master || !!!handleMergeConflict.repoStatus) {
      return null;
    }
    if (!!handleMergeConflict.repoStatus.contentStatus && !!handleMergeConflict.repoStatus.contentStatus.length) {
      return (
        <i
          className={'ai ai-info-circle'}
        />
      );
    } else if (!!handleMergeConflict.repoStatus.aheadBy) {
      return (
        <i
          className={'ai ai-info-circle'}
        />
      );
    } else {
      return null;
    }
  }

  function renderStatusMessage() {
    if (!!handleMergeConflict.repoStatus.contentStatus && !!handleMergeConflict.repoStatus.contentStatus.length) {
      return (
        <Typography>
          Du har endringer på applikasjonen som ikke blir inkludert når du lager en ny versjon.
          Commit og push endringne dine til master for å bygge dem.
        </Typography>
      );
    } else if (!!handleMergeConflict.repoStatus.aheadBy) {
      return (
        <Typography>
          Du har endringer på applikasjonen som ikke blir inkludert når du lager en ny versjon.
          Push endringne dine til master for å bygge dem.
        </Typography>
      );
    }
    return null;
  }

  return (
    <>
      <Grid
        container={true}
        direction={'column'}
        className={classes.appReleaseWrapper}
      >
        <Grid
          item={true}
          className={classes.appReleaseTabs}
        >
          <StyledTabs value={tabIndex} onChange={handleChangeTabIndex}>
            <StyledTab
              label={'Versjoner'}
            />
          </StyledTabs>
        </Grid>

        <Grid
          container={true}
          direction={'column'}
          className={classes.appCreateReleaseWrapper}
        >
          <Grid
            container={true}
            direction={'row'}
            justify={'space-between'}
          >
            <Grid
              item={true}
            >
              <Typography className={classes.appCreateReleaseTitle}>
                Bygg en versjon av appen din utefra den siste commiten til master
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
            Tidligere bygg av appen
          </Typography>
        </Grid>
        <Grid
          item={true}
          className={classes.appReleaseHistory}
        >
          {appReleases.releases.map((release: IRelease, index: number) => (
            <ReleaseComponent key={index} release={release} />
          ))}
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
