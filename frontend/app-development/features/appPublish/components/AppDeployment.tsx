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
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';

export interface AppDeploymentProps {
  envName: string;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
  pipelineDeploymentList?: PipelineDeployment[];
  kubernetesDeployment?: KubernetesDeployment;
  deployPermission: boolean;
  orgName: string;
  imageOptions: ImageOption[];
}

export const AppDeployment = ({
  pipelineDeploymentList,
  kubernetesDeployment,
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
        kubernetesDeploymentStatus={kubernetesDeployment?.status}
        version={kubernetesDeployment?.version}
        envName={envName}
        urlToApp={urlToApp}
        urlToAppLinkTxt={urlToAppLinkTxt}
      />
      <div className={classes.bodyContainer}>
        <AppDeploymentActions
          pipelineDeploymentList={pipelineDeploymentList}
          deployPermission={deployPermission}
          envName={envName}
          imageOptions={imageOptions}
          orgName={orgName}
        />
        <AppDeploymentList
          envName={envName}
          pipelineDeploymentList={pipelineDeploymentList}
          kubernetesDeployment={kubernetesDeployment}
        />
      </div>
    </div>
  );
};
