import React from 'react';
import classes from './Deployment.module.css';

import { DeploymentStatus } from './DeploymentStatus';
import { Deploy } from './Deploy';
import { DeploymentList } from './DeploymentList';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { BuildResult } from 'app-shared/types/Build';

export interface DeploymentProps {
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeployment: KubernetesDeployment;
  envName: string;
  isProduction: boolean;
  urlToApp?: string;
  orgName: string;
}

export const Deployment = ({
  pipelineDeploymentList,
  kubernetesDeployment,
  envName,
  isProduction,
  urlToApp,
  orgName,
}: DeploymentProps) => {
  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <DeploymentStatus
          kubernetesDeployment={kubernetesDeployment}
          envName={envName}
          isProduction={isProduction}
          urlToApp={urlToApp}
        />
      </div>
      <div className={classes.content}>
        <Deploy
          appDeployedVersion={kubernetesDeployment?.version}
          lastBuildId={pipelineDeploymentList[0]?.build?.id}
          inProgress={pipelineDeploymentList.some((item) => item.build.result === BuildResult.none)}
          envName={envName}
          isProduction={isProduction}
          orgName={orgName}
        />
        <DeploymentList
          envName={envName}
          isProduction={isProduction}
          pipelineDeploymentList={pipelineDeploymentList}
        />
      </div>
    </div>
  );
};
