import React from 'react';
import classes from './AppDeploymentHeader.module.css';
import { Heading, Link } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';
import { Alert } from '@digdir/design-system-react';
import { formatDateTime } from 'app-shared/pure/date-format';

export interface AppDeploymentHeaderProps {
  kubernetesDeploymentStatus?: KubernetesDeploymentStatus;
  version?: string;
  envName: string;
  envType: string;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
}

export const AppDeploymentHeader = ({
  kubernetesDeploymentStatus,
  version,
  envName,
  envType,
  urlToApp,
  urlToAppLinkTxt,
}: AppDeploymentHeaderProps) => {
  const { t } = useTranslation();

  const isProduction = envType.toLowerCase() === 'production';
  const headingText = isProduction ? t('general.production') : envName;

  const showLinkToApp = kubernetesDeploymentStatus === KubernetesDeploymentStatus.completed;

  const getStatus = () => {
    if (!kubernetesDeploymentStatus) {
      return t('overview.no_app');
    }
    switch (kubernetesDeploymentStatus) {
      case KubernetesDeploymentStatus.completed:
        return (
          <div className={classes.success}>
            <div>{t('overview.success', { appDeployedVersion: version })}</div>
            <div>
              {showLinkToApp && (
                <Link href={urlToApp} target='_blank' rel='noopener noreferrer'>
                  {urlToAppLinkTxt}
                </Link>
              )}
            </div>
            {/*
            <div>
              <Trans
                i18nKey={'overview.last_published'}
                values={{
                  lastPublishedDate: formatDateTime(appDe?.created),
                }}
              />
            </div>
            */}
          </div>
        );
      case KubernetesDeploymentStatus.failed:
        return t('overview.unavailable');
      default:
        return '';
    }
  };

  const getSeverity = () => {
    switch (kubernetesDeploymentStatus) {
      case KubernetesDeploymentStatus.completed:
        return 'success';
      case KubernetesDeploymentStatus.failed:
        return 'danger';
      default:
        return 'info';
    }
  };

  return (
    <Alert severity={getSeverity()} className={classes.headingContainer}>
      <Heading spacing level={2} size='xsmall' className={classes.envTitle}>
        {headingText}
      </Heading>
      <div>{getStatus()}</div>
    </Alert>
  );
};
