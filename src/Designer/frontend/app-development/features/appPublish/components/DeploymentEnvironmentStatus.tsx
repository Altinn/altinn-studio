import React from 'react';
import classes from './DeploymentEnvironmentStatus.module.css';
import { Alert, Heading, Link, Paragraph, Spinner } from '@digdir/designsystemet-react';
import { Trans, useTranslation } from 'react-i18next';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { DateUtils } from '@studio/pure-functions';
import { ExternalLinkIcon } from 'libs/studio-icons/src';
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
      <Alert severity={severity} className={classes.alert}>
        <Heading spacing level={2} size='xsmall'>
          {envTitle}
        </Heading>
        {kubernetesDeployment?.version && (
          <DeployMoreOptionsMenu linkToEnv={urlToApp} environment={envName} />
        )}

        <Paragraph size='small' spacing={!!footer} className={classes.content}>
          {content}
        </Paragraph>
        {footer && <Paragraph size='xsmall'>{footer}</Paragraph>}
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
      />
    );
  }

  if (!kubernetesDeployment) {
    return <DeploymentStatusAlert severity='info' content={t('app_deployment.status.none')} />;
  }

  if (!kubernetesDeployment?.version) {
    return (
      <DeploymentStatusAlert severity='warning' content={t('app_deployment.status.unavailable')} />
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
            a: (
              <Link href={urlToApp} rel='noopener noreferrer' target='_blank'>
                {' '}
              </Link>
            ),
            ext: <ExternalLinkIcon title={t('app_deployment.status.open_app_in_new_window')} />,
          }}
        />
      }
      footer={
        lastPublishedDate &&
        t('app_deployment.last_published', { lastPublishedDate: formatDateTime(lastPublishedDate) })
      }
    />
  );
};
