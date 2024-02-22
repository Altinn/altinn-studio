import React from 'react';
import classes from './AppDeploymentHeader.module.css';
import { Alert, Heading, Link, Paragraph } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';
import { StudioSpinner } from '@studio/components';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { publishPath } from 'app-shared/api/paths';
import { formatDateDDMMYY, formatTimeHHmm } from 'app-shared/pure/date-format';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

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
        envType={envType}
        envName={envName}
        severity='info'
        content={t('overview.no_app')}
        footer={
          <Trans i18nKey='overview.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
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
              i18nKey={'overview.success'}
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
              i18nKey={'overview.last_published'}
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
          severity='danger'
          content={t('overview.unavailable')}
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
          envType={envType}
          envName={envName}
          severity='info'
          content={
            <StudioSpinner
              size='small'
              spinnerTitle={t('overview.in_progress')}
              showSpinnerTitle
              className={classes.loadingSpinner}
            />
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
  envType: string;
  envName: string;
  severity: 'success' | 'warning' | 'info' | 'danger';
  content: string | React.ReactNode;
  footer: string | JSX.Element;
};
const DeploymentStatusInfo = ({
  envType,
  envName,
  severity,
  content,
  footer,
}: DeploymentStatusInfoProps) => {
  const { t } = useTranslation();
  const isProduction = envType.toLowerCase() === 'production';
  const headingText = isProduction ? t('general.production') : envName;

  return (
    <Alert severity={severity} className={classes.alert}>
      <Heading spacing level={2} size='xsmall' className={classes.heading}>
        {headingText}
      </Heading>
      <Paragraph spacing size='small'>
        {content}
      </Paragraph>
      <Paragraph size='xsmall'>{footer}</Paragraph>
    </Alert>
  );
};
