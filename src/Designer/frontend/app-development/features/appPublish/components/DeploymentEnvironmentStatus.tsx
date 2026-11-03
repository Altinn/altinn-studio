import React, { type JSX } from 'react';
import classes from './DeploymentEnvironmentStatus.module.css';
import {
  StudioLink,
  StudioParagraph,
  StudioSpinner,
  StudioHeading,
  StudioAlert,
} from '@studio/components';
import { Trans, useTranslation } from 'react-i18next';
import {
  runningAppProblems,
  wasRestartedAfterPublish,
  type RunningApp,
} from 'app-shared/types/api/RunningApp';
import { DateUtils } from '@studio/pure-functions';
import { ExternalLinkIcon } from '@studio/icons';
import { DeployMoreOptionsMenu } from './DeployMoreOptionsMenu/DeployMoreOptionsMenu';

export interface DeploymentEnvironmentStatusProps {
  isDeploymentInProgress?: boolean;
  /** The environment could not tell what runs, such as when its cluster does not answer. */
  isStatusUnknown?: boolean;
  runningApp?: RunningApp;
  envName: string;
  isProduction: boolean;
  urlToApp?: string;
}

export const DeploymentEnvironmentStatus = ({
  isDeploymentInProgress,
  isStatusUnknown,
  runningApp,
  envName,
  isProduction,
  urlToApp,
}: DeploymentEnvironmentStatusProps) => {
  const { t } = useTranslation();

  const formatDateTime = (dateAsString: string): string => {
    return t('general.date_time_format', {
      date: DateUtils.formatDateDDMMYYYY(dateAsString),
      time: DateUtils.formatTimeHHmm(dateAsString),
    });
  };

  const isRestart = wasRestartedAfterPublish(runningApp);
  const publishedAt = runningApp?.publishedAt;

  const lastChange = (): string | undefined => {
    if (isRestart) {
      return t('app_deployment.last_restarted', {
        lastRestartedDate: formatDateTime(runningApp.restartedAt),
      });
    }
    return (
      publishedAt &&
      t('app_deployment.last_published', { lastPublishedDate: formatDateTime(publishedAt) })
    );
  };

  const environment: DeploymentStatusAlertEnvironment = {
    envName,
    isProduction,
    runningApp,
    urlToApp,
  };

  if (isDeploymentInProgress) {
    return (
      <DeploymentStatusAlert
        {...environment}
        severity='info'
        content={
          <div className={classes.loadingSpinner}>
            <StudioSpinner aria-hidden data-size='xs' />
            {t('app_deployment.status.inProgress')}
          </div>
        }
      />
    );
  }

  if (isStatusUnknown) {
    return (
      <DeploymentStatusAlert
        {...environment}
        severity='warning'
        content={
          <StudioParagraph className={classes.content} data-size='sm'>
            {t('app_deployment.status.unavailable')}
          </StudioParagraph>
        }
      />
    );
  }

  if (!runningApp) {
    return (
      <DeploymentStatusAlert
        {...environment}
        severity='info'
        content={
          <StudioParagraph className={classes.content} data-size='sm'>
            {t('app_deployment.status.none')}
          </StudioParagraph>
        }
      />
    );
  }

  if (runningApp.status === 'updating') {
    return (
      <DeploymentStatusAlert
        {...environment}
        severity='info'
        content={
          <div className={classes.loadingSpinner}>
            <StudioSpinner aria-hidden data-size='xs' />
            {t(isRestart ? 'app_deployment.status.restarting' : 'app_deployment.status.inProgress')}
          </div>
        }
      />
    );
  }

  const problem = runningApp.status && runningAppProblems[runningApp.status];
  if (problem) {
    return (
      <DeploymentStatusAlert
        {...environment}
        severity={problem.severity}
        content={
          <StudioParagraph className={classes.content} data-size='sm'>
            {t(problem.textKey)}
          </StudioParagraph>
        }
      />
    );
  }

  if (!runningApp?.version) {
    return (
      <DeploymentStatusAlert
        {...environment}
        severity='warning'
        content={
          <StudioParagraph className={classes.content} data-size='sm'>
            {t('app_deployment.status.unavailable')}
          </StudioParagraph>
        }
      />
    );
  }

  return (
    <DeploymentStatusAlert
      {...environment}
      severity='success'
      content={
        <StudioParagraph className={classes.content} spacing data-size='sm'>
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
      footer={lastChange()}
    />
  );
};

type DeploymentStatusAlertEnvironment = Pick<
  DeploymentEnvironmentStatusProps,
  'envName' | 'isProduction' | 'runningApp' | 'urlToApp'
>;

type DeploymentStatusAlertProps = DeploymentStatusAlertEnvironment & {
  severity: 'success' | 'warning' | 'info' | 'danger';
  content: string | React.ReactNode;
  footer?: string | JSX.Element;
};

// Declared outside DeploymentEnvironmentStatus, so a refetch does not remount the menu and close its dialog.
const DeploymentStatusAlert = ({
  envName,
  isProduction,
  runningApp,
  urlToApp,
  severity,
  content,
  footer,
}: DeploymentStatusAlertProps) => {
  const { t } = useTranslation();
  const envTitle = isProduction ? t('general.production') : envName.toUpperCase();
  return (
    <StudioAlert data-color={severity} className={classes.alert}>
      <StudioHeading spacing level={2} data-size='xs'>
        {envTitle}
      </StudioHeading>
      {/* Without a tag, such as for an image deployed by digest, the app still runs and can be restarted. */}
      {runningApp && (
        <DeployMoreOptionsMenu
          linkToEnv={urlToApp}
          environment={envName}
          envTitle={envTitle}
          runningApp={runningApp}
        />
      )}

      {content}
      {footer && <StudioParagraph data-size='xs'>{footer}</StudioParagraph>}
    </StudioAlert>
  );
};
