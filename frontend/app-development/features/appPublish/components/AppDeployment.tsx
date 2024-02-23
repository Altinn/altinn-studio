import React, { useEffect } from 'react';
import classes from './AppDeployment.module.css';
import { Accordion, Link } from '@digdir/design-system-react';
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
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';
import { BuildResult } from 'app-shared/types/Build';

export interface AppDeploymentProps {
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeployment: KubernetesDeployment;
  envName: string;
  envType: string;
  urlToApp?: string;
  deployPermission: boolean;
  orgName: string;
  imageOptions: ImageOption[];
}

export const AppDeployment = ({
  pipelineDeploymentList,
  kubernetesDeployment,
  deployPermission,
  envName,
  envType,
  imageOptions,
  urlToApp,
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
    <div className={classes.appDeployment}>
      <div className={classes.appDeploymentHeader}>
        <AppDeploymentHeader
          kubernetesDeployment={kubernetesDeployment}
          envName={envName}
          envType={envType}
          urlToApp={urlToApp}
        />
      </div>
      <div className={classes.bodyContainer}>
        <AppDeploymentActions
          appDeployedVersion={kubernetesDeployment?.version}
          inProgress={pipelineDeploymentList.some((item) => item.build.result === BuildResult.none)}
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
