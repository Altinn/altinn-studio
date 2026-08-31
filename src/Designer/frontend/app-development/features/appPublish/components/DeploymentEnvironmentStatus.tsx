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
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { DateUtils } from '@studio/pure-functions';
import { ExternalLinkIcon } from '@studio/icons';
import { DeployMoreOptionsMenu } from './DeployMoreOptionsMenu/DeployMoreOptionsMenu';

export interface DeploymentEnvironmentStatusProps {
  lastPublishedDate?: string;
  isDeploymentInProgress?: boolean;
  kubernetesDeployment?: KubernetesDeployment;
  envName: string;
  isProduction: boolean;
  urlToApp?: string;
}

export const DeploymentEnvironmentStatus = ({
  lastPublishedDate,
  isDeploymentInProgress,
  kubernetesDeployment,
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

  const DeploymentStatusAlert = ({
    severity,
    content,
    footer,
  }: {
    severity: 'success' | 'warning' | 'info' | 'danger';
    content: string | React.ReactNode;
    footer?: string | JSX.Element;
  }) => {
    const envTitle = isProduction ? t('general.production') : envName.toUpperCase();
    return (
      <StudioAlert data-color={severity} className={classes.alert}>
        <StudioHeading spacing level={2} data-size='xs'>
          {envTitle}
        </StudioHeading>
        {kubernetesDeployment?.version && (
          <DeployMoreOptionsMenu linkToEnv={urlToApp} environment={envName} />
        )}

        {content}
        {footer && <StudioParagraph data-size='xs'>{footer}</StudioParagraph>}
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
      />
    );
  }

  if (!kubernetesDeployment) {
    return (
      <DeploymentStatusAlert
        severity='info'
        content={
          <StudioParagraph className={classes.content} data-size='sm'>
            {t('app_deployment.status.none')}
          </StudioParagraph>
        }
      />
    );
  }

  if (!kubernetesDeployment?.version) {
    return (
      <DeploymentStatusAlert
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
      severity='success'
      content={
        <StudioParagraph className={classes.content} spacing data-size='sm'>
          <Trans
            i18nKey={'app_deployment.status.succeeded'}
            values={{
              version: kubernetesDeployment.version,
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
        lastPublishedDate &&
        t('app_deployment.last_published', { lastPublishedDate: formatDateTime(lastPublishedDate) })
      }
    />
  );
};
