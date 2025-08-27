import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { Environment } from 'app-shared/types/Environment';
import { DeploymentStatus } from './DeploymentStatus';
import classes from './DeploymentStatusList.module.css';
import { getAppLink } from 'app-shared/ext-urls';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { PROD_ENV_TYPE } from 'app-shared/constants';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import { BuildResult } from 'app-shared/types/Build';

export interface DeploymentStatusListProps {
  orgEnvironmentList: Environment[];
  kubernetesDeploymentList: KubernetesDeployment[];
  pipelineDeploymentList: PipelineDeployment[];
}

export const DeploymentStatusList = ({
  orgEnvironmentList,
  kubernetesDeploymentList,
  pipelineDeploymentList,
}: DeploymentStatusListProps) => {
  const { org, app } = useStudioEnvironmentParams();

  return (
    <div className={classes.container}>
      {orgEnvironmentList.map((orgEnvironment: Environment) => {
        const pipelineDeploymentEnvList = pipelineDeploymentList.filter(
          (item) => item.envName.toLowerCase() === orgEnvironment.name.toLowerCase(),
        );
        const kubernetesDeployment = kubernetesDeploymentList.find(
          (item) => item.envName.toLowerCase() === orgEnvironment.name.toLowerCase(),
        );
        const lastPipelineDeployment = pipelineDeploymentEnvList[0];
        const isDeploymentInProgress = lastPipelineDeployment?.build.result === BuildResult.none;

        return (
          <DeploymentStatus
            deploymentType={lastPipelineDeployment?.deploymentType}
            key={orgEnvironment.name}
            kubernetesDeployment={kubernetesDeployment}
            isDeploymentInProgress={isDeploymentInProgress}
            lastPublishedDate={
              pipelineDeploymentEnvList.find(
                (item) => item.tagName === kubernetesDeployment?.version,
              )?.build.finished
            }
            envName={orgEnvironment.name}
            isProduction={orgEnvironment.type.toLowerCase() === PROD_ENV_TYPE}
            urlToApp={getAppLink(orgEnvironment.appPrefix, orgEnvironment.hostname, org, app)}
          />
        );
      })}
    </div>
  );
};
