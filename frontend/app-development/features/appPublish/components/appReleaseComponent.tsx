import React from 'react';
import classes from './appReleaseComponent.module.css';
import { formatDateTime } from 'app-shared/pure/date-format';
import { getReleaseBuildPipelineLink } from '../../../utils/urlHelper';
import { gitCommitPath } from 'app-shared/api/paths';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';
import { Build, BuildResult, BuildStatus } from 'app-shared/types/Build';
import { AppRelease } from 'app-shared/types/AppRelease';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

interface IAppReleaseComponent {
  release: AppRelease;
}

export function ReleaseComponent(props: IAppReleaseComponent) {
  const { release } = props;

  const { t } = useTranslation();

  function renderStatusIcon(status: Build) {
    if (status.result === BuildResult.succeeded) {
      return <i className={`${classes.buildSucceededIcon} ai ai-check-circle`} />;
    }
    if (status.result === BuildResult.failed) {
      return <i className={`${classes.buildFailedIcon} ai ai-circle-exclamation`} />;
    }
    if (status.status !== BuildStatus.completed) {
      return <StudioSpinner className={classes.spinnerRoot} />;
    }
    return null;
  }

  function RenderBodyInprogressOrErrorBody(): string {
    if (
      release.build.status !== BuildStatus.completed &&
      release.build.result === BuildResult.failed
    ) {
      return t('app_create_release_errors.check_status_on_build_error');
    }
    if (release.build.status !== BuildStatus.completed) {
      return `${t('app_create_release.release_creating')} ${release.createdBy}`;
    }
    return release.body;
  }
  const { org, app } = useStudioUrlParams();
  return (
    <div className={classes.releaseWrapper}>
      <div className={classes.releaseRow}>
        <div>{t('app_release.release_version') + ' ' + release.tagName}</div>
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
