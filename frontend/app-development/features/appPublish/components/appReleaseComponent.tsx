import React from 'react';
import { CircularProgress, Grid, Typography } from '@mui/material';
import Moment from 'moment';
import { getLanguageFromKey } from 'app-shared/utils/language';
import type {
  IAppReleaseErrors,
  IBuild,
  IRelease,
} from '../../../sharedResources/appRelease/types';
import { BuildResult, BuildStatus } from '../../../sharedResources/appRelease/types';
import { getReleaseBuildPipelineLink } from '../../../utils/urlHelper';
import { useAppSelector } from '../../../common/hooks';
import { gitCommitPath } from 'app-shared/api-paths';
import { useParams } from 'react-router-dom';
import classes from './appReleaseComponent.module.css';

interface IAppReleaseComponent {
  release: IRelease;
}

function ReleaseComponent(props: IAppReleaseComponent) {
  const { release } = props;

  const appReleaseErrors: IAppReleaseErrors = useAppSelector((state) => state.appReleases.errors);
  const language: any = useAppSelector((state) => state.languageState.language);

  function renderStatusIcon(status: IBuild) {
    if (status.result === BuildResult.succeeded) {
      return <i className={`${classes.buildSucceededIcon} ai ai-check-circle`} />;
    }
    if (status.result === BuildResult.failed) {
      return <i className={`${classes.buildFailedIcon} ai ai-circle-exclamation`} />;
    }
    if (status.status !== BuildStatus.completed) {
      return (
        <CircularProgress
          classes={{
            root: classes.spinnerRoot,
          }}
          size='2.4rem'
        />
      );
    }
    return null;
  }

  function RenderBodyInprogressOrErrorBody(): string {
    if (
      release.build.status !== BuildStatus.completed &&
      appReleaseErrors.fetchReleaseErrorCode !== null
    ) {
      return getLanguageFromKey('app_create_release_errors.check_status_on_build_error', language);
    }
    if (release.build.status !== BuildStatus.completed) {
      return `${getLanguageFromKey('app_create_release.release_creating', language)} ${
        release.createdBy
      }`;
    }
    return release.body;
  }
  const { org, app } = useParams();
  return (
    <Grid container={true} direction='row' className={classes.releaseWrapper}>
      <Grid container={true} direction='row' justifyContent='space-between'>
        <Grid item={true} className={classes.releaseRow}>
          <Typography className={classes.releaseText}>
            {getLanguageFromKey('app_release.release_version', language)} {release.tagName}
          </Typography>
        </Grid>
        <Grid item={true} className={classes.releaseRow}>
          <Typography className={classes.releaseText}>
            {Moment(release.created).format('DD.MM.YYYY HH:mm')}
          </Typography>
        </Grid>
      </Grid>
      <Grid
        container={true}
        direction='row'
        justifyContent='space-between'
        className={classes.releaseRow}
      >
        <Grid item={true}>
          <Grid container={true} direction='row'>
            {renderStatusIcon(release.build)}
            <Typography className={classes.releaseText}>
              <a
                href={getReleaseBuildPipelineLink(release.build.id)}
                target='_blank'
                rel='noopener noreferrer'
              >
                {getLanguageFromKey('app_release.release_build_log', language)}
              </a>
            </Typography>
          </Grid>
        </Grid>
        <Grid item={true}>
          <Typography className={classes.releaseText}>
            <a
              href={gitCommitPath(org, app, release.targetCommitish)}
              target='_blank'
              rel='noopener noreferrer'
            >
              {getLanguageFromKey('app_release.release_see_commit', language)}
            </a>
          </Typography>
        </Grid>
      </Grid>
      <Grid container={true} direction='row' className={classes.releaseRow}>
        <Grid item={true}>
          <Typography className={classes.releaseText}>
            {RenderBodyInprogressOrErrorBody()}
          </Typography>
        </Grid>
      </Grid>
    </Grid>
  );
}

export default ReleaseComponent;
