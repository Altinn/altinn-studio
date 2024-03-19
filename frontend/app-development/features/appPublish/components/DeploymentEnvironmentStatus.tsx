import React from 'react';
import classes from './DeploymentEnvironmentStatus.module.css';
import { Alert, Heading, Link, Paragraph, Spinner } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { DateUtils } from '@studio/pure-functions';

export interface DeploymentEnvironmentStatusProps {
  kubernetesDeployment?: KubernetesDeployment;
  envName: string;
  isProduction: boolean;
  urlToApp?: string;
}

export const DeploymentEnvironmentStatus = ({
  kubernetesDeployment,
  envName,
  isProduction,
  urlToApp,
}: DeploymentEnvironmentStatusProps) => {
  const { t } = useTranslation();

  const formatDateTime = (dateAsString: string): string => {
    return t('general.date_time_format', {
      date: DateUtils.formatDateDDMMYY(dateAsString),
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
      <Alert severity={severity} className={classes.alert}>
        <Heading spacing level={2} size='xsmall'>
          {envTitle}
        </Heading>
        <Paragraph size='small' spacing={!!footer}>
          {content}
        </Paragraph>
        {footer && <Paragraph size='xsmall'>{footer}</Paragraph>}
      </Alert>
    );
  };

  if (!kubernetesDeployment) {
    return (
      <DeploymentStatusAlert
        severity='info'
        content={t('app_deployment.kubernetes_deployment.status.none')}
      />
    );
  }

  if (!kubernetesDeployment?.status) {
    return (
      <DeploymentStatusAlert
        severity='warning'
        content={t('app_deployment.kubernetes_deployment.status.unavailable')}
      />
    );
  }

  switch (kubernetesDeployment.status) {
    case KubernetesDeploymentStatus.completed:
      return (
        <DeploymentStatusAlert
          severity='success'
          content={
            <Trans
              i18nKey={'app_deployment.kubernetes_deployment.status.completed'}
              values={{
                version: kubernetesDeployment.version,
              }}
              components={{
                a: <Link href={urlToApp}> </Link>,
              }}
            />
          }
          footer={
            <Trans
              i18nKey={'app_deployment.last_published'}
              values={{
                lastPublishedDate: formatDateTime(kubernetesDeployment?.statusDate),
              }}
            />
          }
        />
      );
    case KubernetesDeploymentStatus.failed:
      return (
        <DeploymentStatusAlert
          severity='warning'
          content={t('app_deployment.kubernetes_deployment.status.failed')}
        />
      );
    default:
      return (
        <DeploymentStatusAlert
          severity='info'
          content={
            <span className={classes.loadingSpinner}>
              <Spinner variant='interaction' title='' size='xsmall' />
              {t('app_deployment.kubernetes_deployment.status.progressing')}
            </span>
          }
        />
      );
  }
};
