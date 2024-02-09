import React from 'react';
import classes from './AppDeploymentHeader.module.css';
import { Link } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';

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

  ('/kuberneteswrapper/api/v1/deployments');

  const showLinkToApp =
    kubernetesDeploymentStatus === KubernetesDeploymentStatus.available ||
    kubernetesDeploymentStatus === KubernetesDeploymentStatus.completed;

  const getStatus = () => {
    if (!kubernetesDeploymentStatus) {
      return t('app_deploy.no_app_deployed');
    }
    switch (kubernetesDeploymentStatus) {
      case KubernetesDeploymentStatus.progressing:
      case KubernetesDeploymentStatus.available:
        return 'Deployment of ' + version + ' is in progress';
      case KubernetesDeploymentStatus.completed:
        return t('app_deploy.deployed_version', { appDeployedVersion: version });
      case KubernetesDeploymentStatus.paused:
        return 'Deployment of ' + version + ' has been paused';
      default:
        return 'Deployment of ' + version + ' has failed';
      // return t('app_deploy.deployed_version_unavailable');
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
