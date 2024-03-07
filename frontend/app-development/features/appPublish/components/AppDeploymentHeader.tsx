import React from 'react';
import classes from './AppDeploymentHeader.module.css';
import { Alert, Heading, Link, Paragraph, Spinner } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { formatDateDDMMYY, formatTimeHHmm } from 'app-shared/pure/date-format';

export interface AppDeploymentHeaderProps {
  kubernetesDeployment?: KubernetesDeployment;
  envName: string;
  isProduction: boolean;
  urlToApp?: string;
}

export const AppDeploymentHeader = ({
  kubernetesDeployment,
  envName,
  isProduction,
  urlToApp,
}: AppDeploymentHeaderProps) => {
  const { t } = useTranslation();

  const formatDateTime = (dateAsString: string): string => {
    return t('general.date_time_format', {
      date: formatDateDDMMYY(dateAsString),
      time: formatTimeHHmm(dateAsString),
    });
  };

  if (!kubernetesDeployment?.status) {
    return (
      <DeploymentStatusInfo
        envName={envName}
        isProduction={isProduction}
        severity='warning'
        content={t('app_deployment.kubernetes_deployment.status.unavailable')}
      />
    );
  }

  switch (kubernetesDeployment.status) {
    case KubernetesDeploymentStatus.none:
      return (
        <DeploymentStatusInfo
          envName={envName}
          isProduction={isProduction}
          severity='info'
          content={t('app_deployment.kubernetes_deployment.status.none')}
        />
      );
    case KubernetesDeploymentStatus.completed:
      return (
        <DeploymentStatusInfo
          envName={envName}
          isProduction={isProduction}
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
        <DeploymentStatusInfo
          envName={envName}
          isProduction={isProduction}
          severity='warning'
          content={t('app_deployment.kubernetes_deployment.status.failed')}
        />
      );
    default:
      return (
        <DeploymentStatusInfo
          envName={envName}
          isProduction={isProduction}
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

type DeploymentStatusInfoProps = {
  envName: string;
  isProduction: boolean;
  severity: 'success' | 'warning' | 'info' | 'danger';
  content: string | React.ReactNode;
  footer?: string | JSX.Element;
};
const DeploymentStatusInfo = ({
  envName,
  isProduction,
  severity,
  content,
  footer,
}: DeploymentStatusInfoProps) => {
  const { t } = useTranslation();
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
