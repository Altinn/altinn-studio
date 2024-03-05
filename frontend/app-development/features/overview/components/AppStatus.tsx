import React from 'react';
import classes from './AppStatus.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Trans, useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph, Spinner, Link } from '@digdir/design-system-react';
import { formatDateDDMMYY, formatTimeHHmm } from 'app-shared/pure/date-format';
import { publishPath } from 'app-shared/api/paths';
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';

export type AppStatusProps = {
  kubernetesDeployment?: KubernetesDeployment;
  envName: string;
  envType: string;
  urlToApp?: string;
};

export const AppStatus = ({ kubernetesDeployment, envName, envType, urlToApp }: AppStatusProps) => {
  const { org, app } = useStudioUrlParams();
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
        envType={envType}
        severity='warning'
        content={t('app_deployment.kubernetes_deployment.status.unavailable')}
        footer={
          <Trans i18nKey='overview.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
      />
    );
  }

  switch (kubernetesDeployment.status) {
    case KubernetesDeploymentStatus.none:
      return (
        <DeploymentStatusInfo
          envName={envName}
          envType={envType}
          severity='info'
          content={t('app_deployment.kubernetes_deployment.status.none')}
          footer={
            <Trans i18nKey='overview.go_to_publish'>
              <a href={publishPath(org, app)} />
            </Trans>
          }
        />
      );
    case KubernetesDeploymentStatus.completed:
      return (
        <DeploymentStatusInfo
          envName={envName}
          envType={envType}
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
          envType={envType}
          severity='danger'
          content={t('app_deployment.kubernetes_deployment.status.failed')}
          footer={
            <Trans i18nKey='overview.go_to_publish'>
              <a href={publishPath(org, app)} />
            </Trans>
          }
        />
      );
    default:
      return (
        <DeploymentStatusInfo
          envName={envName}
          envType={envType}
          severity='info'
          content={
            <span className={classes.loadingSpinner}>
              <Spinner variant='interaction' title='' size='xsmall' />
              {t('app_deployment.kubernetes_deployment.status.progressing')}
            </span>
          }
          footer={
            <Trans i18nKey='overview.go_to_publish'>
              <a href={publishPath(org, app)} />
            </Trans>
          }
        />
      );
  }
};

type DeploymentStatusInfoProps = {
  envName: string;
  envType: string;
  severity: 'success' | 'warning' | 'info' | 'danger';
  content: string | React.ReactNode;
  footer: string | JSX.Element;
};
const DeploymentStatusInfo = ({
  envName,
  envType,
  severity,
  content,
  footer,
}: DeploymentStatusInfoProps) => {
  const { t } = useTranslation();
  const isProduction = envType.toLowerCase() === 'production';
  const envTitle = isProduction ? t('general.production') : envName.toUpperCase();
  return (
    <Alert severity={severity} className={classes.alert}>
      <Heading spacing level={2} size='xsmall'>
        {envTitle}
      </Heading>
      <Paragraph spacing size='small'>
        {content}
      </Paragraph>
      <Paragraph size='xsmall'>{footer}</Paragraph>
    </Alert>
  );
};
