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
import { getReleaseBuildPipelineLink } from '../../../utils/urlHelper';
import { gitCommitPath } from 'app-shared/api-paths';
import { useAppSelector } from '../../../common/hooks';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface IAppReleaseComponent {
  release: IRelease;
}

export function ReleaseComponent(props: IAppReleaseComponent) {
  const { release } = props;

  const appReleaseErrors: IAppReleaseErrors = useAppSelector((state) => state.appReleases.errors);
  const { t } = useTranslation();

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
      return t('app_create_release_errors.check_status_on_build_error');
    }
    if (release.build.status !== BuildStatus.completed) {
      return `${t('app_create_release.release_creating')} ${
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
          {t('app_release.release_version')} {release.tagName}
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
            {t('app_release.release_build_log')}
          </a>
        </div>
        <div>
          <a
            href={gitCommitPath(org, app, release.targetCommitish)}
            target='_blank'
            rel='noopener noreferrer'
          >
            {t('app_release.release_see_commit')}
          </a>
        </div>
      </div>
      <div className={classes.releaseRow}>{RenderBodyInprogressOrErrorBody()}</div>
    </div>
  );
}
