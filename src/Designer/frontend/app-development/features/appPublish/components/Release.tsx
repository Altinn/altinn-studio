import React from 'react';
import classes from './Release.module.css';
import { DateUtils } from 'libs/studio-pure-functions/src';
import { getReleaseBuildPipelineLink } from '../../../utils/urlHelper';
import { gitCommitPath } from 'app-shared/api/paths';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components-legacy';
import type { Build } from 'app-shared/types/Build';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';
import type { AppRelease } from 'app-shared/types/AppRelease';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { CheckmarkCircleIcon, ExclamationmarkTriangleIcon } from 'libs/studio-icons/src';

interface IReleaseComponent {
  release: AppRelease;
}

export function Release(props: IReleaseComponent) {
  const { release } = props;

  const { t } = useTranslation();

  function renderStatusIcon(status: Build) {
    if (status.result === BuildResult.succeeded) {
      return <CheckmarkCircleIcon className={`${classes.buildSucceededIcon}`} />;
    }
    if (status.result === BuildResult.failed) {
      return <ExclamationmarkTriangleIcon className={`${classes.buildFailedIcon}`} />;
    }
    if (status.status !== BuildStatus.completed) {
      return (
        <StudioSpinner
          spinnerTitle={t('app_create_release.loading')}
          showSpinnerTitle={false}
          className={classes.spinnerRoot}
        />
      );
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
  const { org, app } = useStudioEnvironmentParams();
  return (
    <div className={classes.releaseWrapper}>
      <div className={classes.releaseRow}>
        <div>{t('app_release.release_version') + ' ' + release.tagName}</div>
        <time dateTime={release.created}>{DateUtils.formatDateTime(release.created)}</time>
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
