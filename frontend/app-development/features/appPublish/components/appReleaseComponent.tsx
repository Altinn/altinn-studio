import React from 'react';
import classes from './appReleaseComponent.module.css';
import type {
  IAppReleaseErrors,
  IBuild,
  IRelease,
} from '../../../sharedResources/appRelease/types';
import { BuildResult, BuildStatus } from '../../../sharedResources/appRelease/types';
import { CircularProgress } from '@mui/material';
import { formatDateTime } from 'app-shared/pure/date-format';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { getReleaseBuildPipelineLink } from '../../../utils/urlHelper';
import { gitCommitPath } from 'app-shared/api-paths';
import { useAppSelector } from '../../../common/hooks';
import { useParams } from 'react-router-dom';

interface IAppReleaseComponent {
  release: IRelease;
}

export function ReleaseComponent(props: IAppReleaseComponent) {
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
      return <CircularProgress classes={{ root: classes.spinnerRoot }} size='2.4rem' />;
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
    <div className={classes.releaseWrapper}>
      <div className={classes.releaseRow}>
        <div>
          {getLanguageFromKey('app_release.release_version', language)} {release.tagName}
        </div>
        <time dateTime={release.created}>{formatDateTime(release.created)}</time>
      </div>
      <div className={classes.releaseRow}>
        <div>
          {renderStatusIcon(release.build)}
          <a
            href={getReleaseBuildPipelineLink(release.build.id)}
            target='_blank'
            rel='noopener noreferrer'
          >
            {getLanguageFromKey('app_release.release_build_log', language)}
          </a>
        </div>
        <div>
          <a
            href={gitCommitPath(org, app, release.targetCommitish)}
            target='_blank'
            rel='noopener noreferrer'
          >
            {getLanguageFromKey('app_release.release_see_commit', language)}
          </a>
        </div>
      </div>
      <div className={classes.releaseRow}>{RenderBodyInprogressOrErrorBody()}</div>
    </div>
  );
}
