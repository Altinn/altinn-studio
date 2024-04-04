import React from 'react';
import classes from './DeploymentStatus.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Trans, useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph, Spinner, Link } from '@digdir/design-system-react';
import { DateUtils } from '@studio/pure-functions';
import { publishPath } from 'app-shared/api/paths';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';

export type DeploymentStatusProps = {
  kubernetesDeployment?: KubernetesDeployment;
  isDeploymentInProgress?: boolean;
  lastPublishedDate?: string;
  envName: string;
  isProduction: boolean;
  urlToApp?: string;
};

export const DeploymentStatus = ({
  kubernetesDeployment,
  isDeploymentInProgress,
  lastPublishedDate,
  envName,
  isProduction,
  urlToApp,
}: DeploymentStatusProps) => {
  const { org, app } = useStudioUrlParams();
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
    footer: string | JSX.Element;
  }) => {
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

  if (isDeploymentInProgress) {
    return (
      <DeploymentStatusAlert
        severity='info'
        content={
          <span className={classes.loadingSpinner}>
            <Spinner variant='interaction' title='' size='xsmall' />
            {t('app_deployment.status.inProgress')}
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

  if (!kubernetesDeployment) {
    return (
      <DeploymentStatusAlert
        severity='info'
        content={t('app_deployment.status.none')}
        footer={
          <Trans i18nKey='overview.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
      />
    );
  }

  if (!kubernetesDeployment?.version) {
    return (
      <DeploymentStatusAlert
        severity='warning'
        content={t('app_deployment.status.unavailable')}
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
        <Trans
          i18nKey={'app_deployment.status.succeeded'}
          values={{
            version: kubernetesDeployment.version,
          }}
          components={{
            a: <Link href={urlToApp}> </Link>,
          }}
        />
      }
      footer={
        lastPublishedDate && (
          <Trans
            i18nKey={'app_deployment.last_published'}
            values={{
              lastPublishedDate: formatDateTime(lastPublishedDate),
            }}
          />
        )
      }
    />
  );
};
