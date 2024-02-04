import React from 'react';
import classes from './AppDeployment.module.css';
import { Link } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

import type { IDeployment } from '../../../sharedResources/appDeployment/types';
import { DeploymentStatus } from './DeploymentStatus';

export interface AppDeploymentHeaderProps {
  deployHistory?: IDeployment[];
  envName: string;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
  showLinkToApp: boolean;
}

export const AppDeploymentHeader = ({
  deployHistory,
  envName,
  urlToApp,
  urlToAppLinkTxt,
  showLinkToApp,
}: AppDeploymentHeaderProps) => {
  const { t } = useTranslation();

  const latestDeploy = deployHistory ? deployHistory[0] : null;
  const deploymentInEnv = deployHistory ? deployHistory.find((d) => d.deployedInEnv) : false;
  const deployInProgress = latestDeploy?.status === DeploymentStatus.progressing;

  const appDeployedAndReachable = !!deploymentInEnv;
  const deployFailed = latestDeploy && latestDeploy.status === DeploymentStatus.failed;
  const deployedVersionNotReachable =
    latestDeploy && !appDeployedAndReachable && latestDeploy.status === DeploymentStatus.completed;

  const noAppDeployed = !latestDeploy || deployInProgress;

  return (
    <div className={classes.headingContainer}>
      <div className={classes.envTitle}>{t('app_deploy.environment', { envName })}</div>
      <div className={classes.gridItem}>
        {appDeployedAndReachable &&
          !deployInProgress &&
          t('app_deploy.deployed_version', { appDeployedVersion: deploymentInEnv.tagName })}
        {(noAppDeployed || (deployFailed && !appDeployedAndReachable)) &&
          t('app_deploy.no_app_deployed')}
        {deployedVersionNotReachable && t('app_deploy.deployed_version_unavailable')}
      </div>
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
