import {
  CircularProgress,
  createStyles,
  Grid,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { BuildResult, BuildStatus, IBuild, IRelease } from '../../../sharedResources/appRelease/types';
import { getReleaseBuildPipelineLink, getGitCommitLink } from '../../../utils/urlHelper';

const styles = createStyles({
  releaseWrapper: {
    padding: '1.2rem',
    borderBottom: `1px solid ${altinnTheme.altinnPalette.primary.greyMedium}`,
  },
  releaseRow: {
    paddingTop: '1rem',
  },
  buildFailedIcon: {
    color: altinnTheme.altinnPalette.primary.red,
    height: 10,
    width: 10,
    padding: '1.2rem 1rem 1.2rem 0rem',
  },
  buildSucceededIcon: {
    color: altinnTheme.altinnPalette.primary.green,
    height: 10,
    width: 10,
    padding: '1.2rem 1rem 1.2rem 0rem',
  },
  spinnerRoot: {
    color: altinnTheme.altinnPalette.primary.blue,
    marginRight: '1rem',
  },
  releaseText: {
    fontSize: '1.6rem',
  }
});

export interface IAppReleaseComponent extends WithStyles<typeof styles> {
  release: IRelease;
}

function ReleaseComponent(props: IAppReleaseComponent) {
  const { classes, release } = props;

  const language: any = useSelector((state: IServiceDevelopmentState) => state.language)

  function renderStatusIcon(status: IBuild) {
    if (status.result === BuildResult.succeeded) {
      return (
        <i className={`${classes.buildSucceededIcon} ai ai-check-circle`} />
      );
    }
    if (status.result === BuildResult.failed) {
      return (
        <i className={`${classes.buildFailedIcon} ai ai-circle-exclamation`} />
      );
    }
    if (status.status !== BuildStatus.completed) {
      return (
        <CircularProgress
          classes={{
            root: classes.spinnerRoot,
          }}
          size={'2.4rem'}
        />
      );
    }
    return null;
  }

  return (
    <Grid
      container={true}
      direction={'row'}
      className={classes.releaseWrapper}
    >
      <Grid
        container={true}
        direction={'row'}
        justify={'space-between'}
      >
        <Grid
          item={true}
          className={classes.releaseRow}
        >
          <Typography
            className={classes.releaseText}
          >
            {
              !!language &&
                !!language.app_release &&
                !!language.app_release.release_version ?
                language.app_release.release_version :
                'language.app_release.release_version'
            }
            {release.tagName}
          </Typography>
        </Grid>
        <Grid
          item={true}
          className={classes.releaseRow}
        >
          <Typography
            className={classes.releaseText}
          >
            {release.created}
          </Typography>
        </Grid>
      </Grid>
      <Grid
        container={true}
        direction={'row'}
        justify={'space-between'}
        className={classes.releaseRow}
      >
        <Grid
          item={true}
        >
          <Grid
            container={true}
            direction={'row'}
          >
            {renderStatusIcon(release.build)}
            <Typography
              className={classes.releaseText}
            >
              <a
                href={getReleaseBuildPipelineLink(release.build.id)}
                target={'_blank'}
              >
                {
                  !!language &&
                    !!language.app_release &&
                    !!language.app_release.release_build_log ?
                    language.app_release.release_build_log :
                    'language.app_release.release_build_log'
                }
              </a>
            </Typography>
          </Grid>
        </Grid>
        <Grid item={true}>
          <Typography
            className={classes.releaseText}
          >
            <a
              href={getGitCommitLink(release.targetCommitish)}
              target={'_blank'}
            >
              {
                !!language &&
                  !!language.app_release &&
                  !!language.app_release.release_see_commit ?
                  language.app_release.release_see_commit :
                  'language.app_release.release_see_commit'
              }
            </a>
          </Typography>
        </Grid>
      </Grid>
      <Grid
        container={true}
        direction={'row'}
        className={classes.releaseRow}
      >
        <Grid item={true}>
          <Typography
            className={classes.releaseText}
          >
            {release.body}
          </Typography>
        </Grid>
      </Grid>
    </Grid>
  );
}

export default withStyles(styles)(ReleaseComponent);
