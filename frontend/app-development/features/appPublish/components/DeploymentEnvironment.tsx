import React from 'react';
import classes from './DeploymentEnvironment.module.css';

import { DeploymentEnvironmentStatus } from './DeploymentEnvironmentStatus';
import { Deploy } from './Deploy';
import { DeploymentEnvironmentLogList } from './DeploymentEnvironmentLogList';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { BuildResult } from 'app-shared/types/Build';

export interface DeploymentEnvironmentProps {
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeployment: KubernetesDeployment;
  envName: string;
  isProduction: boolean;
  urlToApp?: string;
  orgName: string;
}

export const DeploymentEnvironment = ({
  pipelineDeploymentList,
  kubernetesDeployment,
  envName,
  isProduction,
  urlToApp,
  orgName,
}: DeploymentEnvironmentProps) => {
  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <DeploymentEnvironmentStatus
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
        <DeploymentEnvironmentLogList
          envName={envName}
          isProduction={isProduction}
          pipelineDeploymentList={pipelineDeploymentList}
        />
      </div>
    </div>
  );
};
