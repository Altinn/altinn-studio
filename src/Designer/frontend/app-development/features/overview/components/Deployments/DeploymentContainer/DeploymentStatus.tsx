import React, { type JSX } from 'react';
import classes from './DeploymentStatus.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Trans, useTranslation } from 'react-i18next';
import {
  StudioLink,
  StudioParagraph,
  StudioSpinner,
  StudioHeading,
  StudioAlert,
} from '@studio/components';
import { DateUtils } from '@studio/pure-functions';
import { publishPath } from 'app-shared/api/paths';
import {
  runningAppProblems,
  wasRestartedAfterPublish,
  type RunningApp,
} from 'app-shared/types/api/RunningApp';
import { ExternalLinkIcon } from '@studio/icons';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';

export type DeploymentStatusProps = {
  runningApp?: RunningApp;
  deploymentType: PipelineDeployment['deploymentType'];
  isDeploymentInProgress?: boolean;
  /** The environment could not tell what runs, such as when its cluster does not answer. */
  isStatusUnknown?: boolean;
  envName: string;
  isProduction: boolean;
  urlToApp?: string;
};

export const DeploymentStatus = ({
  runningApp,
  deploymentType,
  isDeploymentInProgress,
  isStatusUnknown,
  envName,
  isProduction,
  urlToApp,
}: DeploymentStatusProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  const formatDateTime = (dateAsString: string): string => {
    return t('general.date_time_format', {
      date: DateUtils.formatDateDDMMYYYY(dateAsString),
      time: DateUtils.formatTimeHHmm(dateAsString),
    });
  };

  const DeploymentStatusAlert = ({
    severity,
    content,
    footer,
  }: {
    severity: 'success' | 'warning' | 'info' | 'danger';
    content: string | React.ReactNode;
    footer: string | JSX.Element;
  }) => {
    const envTitle = isProduction ? t('general.production') : envName.toUpperCase();
    return (
      <StudioAlert data-color={severity} className={classes.alert}>
        <StudioHeading spacing level={2} data-size='xs'>
          {envTitle}
        </StudioHeading>
        {content}
        <StudioParagraph data-size='xs'>{footer}</StudioParagraph>
      </StudioAlert>
    );
  };

  if (isDeploymentInProgress) {
    return (
      <DeploymentStatusAlert
        severity='info'
        content={
          <div className={classes.loadingSpinner}>
            <StudioSpinner aria-hidden data-size='xs' />
            {t('app_deployment.status.inProgress')}
          </div>
        }
        footer={
          <Trans i18nKey='overview.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
      />
    );
  }

  if (isStatusUnknown) {
    return (
      <DeploymentStatusAlert
        severity='warning'
        content={
          <StudioParagraph spacing>{t('app_deployment.status.unavailable')}</StudioParagraph>
        }
        footer={
          <Trans i18nKey='overview.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
      />
    );
  }

  const isUndeploy = deploymentType === 'Decommission';
  if (!runningApp || isUndeploy) {
    return (
      <DeploymentStatusAlert
        severity='info'
        content={<StudioParagraph spacing>{t('app_deployment.status.none')}</StudioParagraph>}
        footer={
          <Trans i18nKey='overview.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
      />
    );
  }
  const isDeploy = deploymentType === 'Deploy';
  const goToPublish = (
    <Trans i18nKey='overview.go_to_publish'>
      <a href={publishPath(org, app)} />
    </Trans>
  );

  if (runningApp.status === 'updating') {
    const isRestart = wasRestartedAfterPublish(runningApp);
    return (
      <DeploymentStatusAlert
        severity='info'
        content={
          <div className={classes.loadingSpinner}>
            <StudioSpinner aria-hidden data-size='xs' />
            {t(isRestart ? 'app_deployment.status.restarting' : 'app_deployment.status.inProgress')}
          </div>
        }
        footer={goToPublish}
      />
    );
  }

  const problem = runningApp.status && runningAppProblems[runningApp.status];
  if (problem) {
    return (
      <DeploymentStatusAlert
        severity={problem.severity}
        content={<StudioParagraph spacing>{t(problem.textKey)}</StudioParagraph>}
        footer={goToPublish}
      />
    );
  }

  if (!runningApp?.version && isDeploy) {
    return (
      <DeploymentStatusAlert
        severity='warning'
        content={
          <StudioParagraph spacing>{t('app_deployment.status.unavailable')}</StudioParagraph>
        }
        footer={
          <Trans i18nKey='overview.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
      />
    );
  }

  return (
    <DeploymentStatusAlert
      severity='success'
      content={
        <StudioParagraph spacing>
          <Trans
            i18nKey={'app_deployment.status.succeeded'}
            values={{
              version: runningApp.version,
            }}
            components={{
              a: (
                <StudioLink href={urlToApp} rel='noopener noreferrer' target='_blank'>
                  {' '}
                </StudioLink>
              ),
              ext: <ExternalLinkIcon title={t('app_deployment.status.open_app_in_new_window')} />,
            }}
          />
        </StudioParagraph>
      }
      footer={
        wasRestartedAfterPublish(runningApp) ? (
          <Trans
            i18nKey={'app_deployment.last_restarted'}
            values={{
              lastRestartedDate: formatDateTime(runningApp.restartedAt),
            }}
          />
        ) : (
          runningApp.publishedAt && (
            <Trans
              i18nKey={'app_deployment.last_published'}
              values={{
                lastPublishedDate: formatDateTime(runningApp.publishedAt),
              }}
            />
          )
        )
      }
    />
  );
};
