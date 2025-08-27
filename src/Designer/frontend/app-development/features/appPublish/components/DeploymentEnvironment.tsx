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
  const lastPipelineDeployment = pipelineDeploymentList[0];
  const isDeploymentInProgress = lastPipelineDeployment?.build.result === BuildResult.none;
  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <DeploymentEnvironmentStatus
          kubernetesDeployment={kubernetesDeployment}
          isDeploymentInProgress={isDeploymentInProgress}
          lastPublishedDate={
            pipelineDeploymentList.find((item) => item.tagName === kubernetesDeployment?.version)
              ?.build.finished
          }
          envName={envName}
          isProduction={isProduction}
          urlToApp={urlToApp}
        />
      </div>
      <div className={classes.content}>
        <Deploy
          appDeployedVersion={kubernetesDeployment?.version}
          isDeploymentInProgress={isDeploymentInProgress}
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
