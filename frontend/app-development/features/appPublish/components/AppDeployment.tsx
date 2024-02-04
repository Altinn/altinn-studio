import React, { useEffect } from 'react';
import classes from './AppDeployment.module.css';
import { Link } from '@digdir/design-system-react';
import { useCreateDeploymentMutation } from '../../../hooks/mutations';
import { useTranslation, Trans } from 'react-i18next';

import type { IDeployment } from '../../../sharedResources/appDeployment/types';
import { toast } from 'react-toastify';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { DeploymentStatus } from './DeploymentStatus';
import { AppDeploymentHeader } from './AppDeploymentHeader';
import { AppDeploymentActions } from './AppDeploymentActions';
import { AppDeploymentList } from './AppDeploymentList';
import type { ImageOption } from './ImageOption';

export interface AppDeploymentProps {
  envName: string;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
  deployHistory?: IDeployment[];
  deployPermission: boolean;
  orgName: string;
  imageOptions: ImageOption[];
  showLinkToApp: boolean;
}

export const AppDeployment = ({
  deployHistory,
  deployPermission,
  envName,
  imageOptions,
  urlToApp,
  urlToAppLinkTxt,
  orgName,
  showLinkToApp,
}: AppDeploymentProps) => {
  console.log('---', envName, '---');
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();
  const mutation = useCreateDeploymentMutation(org, app, { hideDefaultError: true });

  const latestDeploy = deployHistory ? deployHistory[0] : null;
  const deploymentInEnv = deployHistory ? deployHistory.find((d) => d.deployedInEnv) : false;

  const appDeployedAndReachable = !!deploymentInEnv;
  const deployFailed = latestDeploy && latestDeploy.status === DeploymentStatus.failed;
  const deployedVersionNotReachable =
    latestDeploy && !appDeployedAndReachable && latestDeploy.status === DeploymentStatus.completed;

  useEffect(() => {
    if (deployPermission && latestDeploy && deployedVersionNotReachable) {
      toast.error(() => (
        <Trans i18nKey='app_deploy_messages.unable_to_list_deploys'>
          <Link inverted href='mailto:tjenesteeier@altinn.no'>
            tjenesteeier@altinn.no
          </Link>
        </Trans>
      ));
    }
  }, [deployPermission, latestDeploy, deployedVersionNotReachable]);

  useEffect(() => {
    if (!deployPermission) return;
    if (mutation.isError) {
      toast.error(() => (
        <Trans i18nKey='app_deploy_messages.technical_error_1'>
          <Link inverted href='mailto:tjenesteeier@altinn.no'>
            tjenesteeier@altinn.no
          </Link>
        </Trans>
      ));
    } else if (deployFailed) {
      toast.error(() =>
        t('app_deploy_messages.failed', {
          envName: latestDeploy.envName,
          tagName: latestDeploy.tagName,
          time: latestDeploy.build.started,
        }),
      );
    }
  }, [deployPermission, deployFailed, t, latestDeploy, mutation.isError]);

  return (
    <div className={classes.mainContainer}>
      <AppDeploymentHeader
        deployHistory={deployHistory}
        envName={envName}
        urlToApp={urlToApp}
        urlToAppLinkTxt={urlToAppLinkTxt}
        showLinkToApp={showLinkToApp}
      />
      <div className={classes.bodyContainer}>
        <AppDeploymentActions
          deployHistory={deployHistory}
          deployPermission={deployPermission}
          envName={envName}
          imageOptions={imageOptions}
          orgName={orgName}
        />
        <AppDeploymentList
          deployHistory={deployHistory}
          deployPermission={deployPermission}
          envName={envName}
        />
      </div>
    </div>
  );
};
