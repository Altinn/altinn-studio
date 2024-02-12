import React from 'react';
import classes from './AppDeploymentHeader.module.css';
import { Link } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';
import { Alert } from '@digdir/design-system-react';

export interface AppDeploymentHeaderProps {
  kubernetesDeploymentStatus?: KubernetesDeploymentStatus;
  version?: string;
  envName: string;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
}

export const AppDeploymentHeader = ({
  kubernetesDeploymentStatus,
  version,
  envName,
  urlToApp,
  urlToAppLinkTxt,
}: AppDeploymentHeaderProps) => {
  const { t } = useTranslation();

  const showLinkToApp = kubernetesDeploymentStatus === KubernetesDeploymentStatus.completed;

  const getStatus = () => {
    if (!kubernetesDeploymentStatus) {
      /*
        <Alert severity='danger'>
          <Trans i18nKey={'app_deploy_messages.technical_error_1'}>
            <a href='mailto:tjenesteeier@altinn.no' />
          </Trans>
        </Alert>
      */
      return t('app_deploy.no_app_deployed');
    }
    switch (kubernetesDeploymentStatus) {
      case KubernetesDeploymentStatus.completed:
        return t('app_deploy.deployed_version', { appDeployedVersion: version });
      case KubernetesDeploymentStatus.failed:
        <Alert severity='danger'>
          <Trans i18nKey={'app_deploy_messages.technical_error_1'}>
            <a href='mailto:tjenesteeier@altinn.no' />
          </Trans>
        </Alert>;
      //return t('app_deploy.deployed_version_unavailable');
      default:
        return '';
    }
  };

  return (
    <div className={classes.headingContainer}>
      <div className={classes.envTitle}>{t('app_deploy.environment', { envName })}</div>
      <div className={classes.gridItem}>{getStatus()}</div>
      <div className={classes.gridItem}>
        {showLinkToApp && (
          <Link href={urlToApp} target='_blank' rel='noopener noreferrer'>
            {urlToAppLinkTxt}
          </Link>
        )}
      </div>
    </div>
  );
};
