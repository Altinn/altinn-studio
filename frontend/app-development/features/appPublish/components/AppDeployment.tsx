import React, { useEffect } from 'react';
import classes from './AppDeployment.module.css';
import { Link } from '@digdir/design-system-react';
import { useCreateDeploymentMutation } from '../../../hooks/mutations';
import { useTranslation, Trans } from 'react-i18next';

import { toast } from 'react-toastify';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { AppDeploymentHeader } from './AppDeploymentHeader';
import { AppDeploymentActions } from './AppDeploymentActions';
import { AppDeploymentList } from './AppDeploymentList';
import type { ImageOption } from './ImageOption';
import type { AppDeployment as AppDeploymentType } from 'app-shared/types/api/AppDeployment';

export interface AppDeploymentProps {
  appDeployment: AppDeploymentType;
  envName: string;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
  deployPermission: boolean;
  orgName: string;
  imageOptions: ImageOption[];
}

export const AppDeployment = ({
  appDeployment,
  deployPermission,
  envName,
  imageOptions,
  urlToApp,
  urlToAppLinkTxt,
  orgName,
}: AppDeploymentProps) => {
  console.log('---', envName, '---');
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();
  const mutation = useCreateDeploymentMutation(org, app, { hideDefaultError: true });

  // useEffect(() => {
  //   if (deployPermission && latestDeploy && deployedVersionNotReachable) {
  //     toast.error(() => (
  //       <Trans
  //         i18nKey={'app_deploy_messages.unable_to_list_deploys'}
  //         components={{
  //           a: (
  //             <Link href='/contact' inverted={true}>
  //               {' '}
  //             </Link>
  //           ),
  //         }}
  //       />
  //     ));
  //   }
  // }, [deployPermission, latestDeploy, deployedVersionNotReachable]);

  return (
    <div className={classes.mainContainer}>
      <AppDeploymentHeader
        kubernetesDeploymentStatus={appDeployment.kubernetesDeployment?.status}
        version={appDeployment.kubernetesDeployment?.version}
        envName={envName}
        urlToApp={urlToApp}
        urlToAppLinkTxt={urlToAppLinkTxt}
      />
      <div className={classes.bodyContainer}>
        <AppDeploymentActions
          pipelineDeploymentList={appDeployment.pipelineDeploymentList}
          deployPermission={deployPermission}
          envName={envName}
          imageOptions={imageOptions}
          orgName={orgName}
        />
        <AppDeploymentList
          envName={envName}
          pipelineDeploymentList={appDeployment.pipelineDeploymentList}
          kubernetesDeployment={appDeployment.kubernetesDeployment}
        />
      </div>
    </div>
  );
};
