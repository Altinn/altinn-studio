import React from 'react';
import classes from './AppDeploymentHeader.module.css';
import { Alert, Heading, Link, Paragraph, Spinner } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { formatDateDDMMYY, formatTimeHHmm } from 'app-shared/pure/date-format';
import classNames from 'classnames';

export interface AppDeploymentHeaderProps {
  kubernetesDeployment?: KubernetesDeployment;
  envName: string;
  envType: string;
  urlToApp?: string;
}

export const AppDeploymentHeader = ({
  kubernetesDeployment,
  envName,
  envType,
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
        envType={envType}
        envName={envName}
        severity='info'
        content={t('app_deployment.kubernetes_deployment.status.none')}
      />
    );
  }

  switch (kubernetesDeployment.status) {
    case KubernetesDeploymentStatus.completed:
      return (
        <DeploymentStatusInfo
          envType={envType}
          envName={envName}
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
          envType={envType}
          envName={envName}
          severity='warning'
          content={t('app_deployment.kubernetes_deployment.status.failed')}
        />
      );
    default:
      return (
        <DeploymentStatusInfo
          envType={envType}
          envName={envName}
          severity='info'
          content={
            <span className={classes.loadingSpinner}>
              <Spinner
                variant='interaction'
                title={t('app_deployment.kubernetes_deployment.status.progressing')}
                size='xsmall'
              />
              {t('app_deployment.kubernetes_deployment.status.progressing')}
            </span>
          }
          className={classes.inProgress}
        />
      );
  }
};

type DeploymentStatusInfoProps = {
  envType: string;
  envName: string;
  severity: 'success' | 'warning' | 'info' | 'danger';
  content: string | React.ReactNode;
  footer?: string | JSX.Element;
  className?: string;
};
const DeploymentStatusInfo = ({
  envType,
  envName,
  severity,
  content,
  footer,
  className,
}: DeploymentStatusInfoProps) => {
  const { t } = useTranslation();
  const isProduction = envType.toLowerCase() === 'production';
  const headingText = isProduction ? t('general.production') : envName;

  return (
    <Alert severity={severity} className={classNames(classes.alert, className)}>
      <Heading spacing level={2} size='xsmall' className={classes.heading}>
        {headingText}
      </Heading>
      <Paragraph size='small' spacing={!!footer}>
        {content}
      </Paragraph>
      {footer && <Paragraph size='xsmall'>{footer}</Paragraph>}
    </Alert>
  );
};
