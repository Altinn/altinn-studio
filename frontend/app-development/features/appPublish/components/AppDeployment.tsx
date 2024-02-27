import React from 'react';
import classes from './AppDeployment.module.css';

import { AppDeploymentHeader } from './AppDeploymentHeader';
import { AppDeploymentActions } from './AppDeploymentActions';
import { AppDeploymentList } from './AppDeploymentList';
import type { ImageOption } from './ImageOption';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
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
  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <AppDeploymentHeader
          kubernetesDeployment={kubernetesDeployment}
          envName={envName}
          envType={envType}
          urlToApp={urlToApp}
        />
      </div>
      <div className={classes.content}>
        <AppDeploymentActions
          appDeployedVersion={kubernetesDeployment?.version}
          lastBuildId={pipelineDeploymentList[0]?.build?.id}
          inProgress={pipelineDeploymentList.some((item) => item.build.result === BuildResult.none)}
          deployPermission={deployPermission}
          envName={envName}
          imageOptions={imageOptions}
          orgName={orgName}
        />
        <AppDeploymentList envName={envName} pipelineDeploymentList={pipelineDeploymentList} />
      </div>
    </div>
  );
};
