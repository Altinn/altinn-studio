import React from 'react';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import type { Environment } from 'app-shared/types/Environment';
import { DeploymentStatus } from './DeploymentStatus';
import classes from './DeploymentStatusList.module.css';
import { getAppLink } from 'app-shared/ext-urls';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';

export interface DeploymentStatusListProps {
  orgEnvironmentList: Environment[];
  kubernetesDeploymentList: KubernetesDeployment[];
}

export const DeploymentStatusList = ({
  orgEnvironmentList,
  kubernetesDeploymentList,
}: DeploymentStatusListProps) => {
  const { org, app } = useStudioUrlParams();

  return (
    <div className={classes.container}>
      {orgEnvironmentList.map((orgEnvironment: Environment) => {
        const kubernetesDeployment = kubernetesDeploymentList.find(
          (item) => item.envName.toLowerCase() === orgEnvironment.name.toLowerCase(),
        );
        return (
          <DeploymentStatus
            key={orgEnvironment.name}
            kubernetesDeployment={kubernetesDeployment}
            envName={orgEnvironment.name}
            isProduction={orgEnvironment.type.toLowerCase() === 'production'}
            urlToApp={getAppLink(orgEnvironment.appPrefix, orgEnvironment.hostname, org, app)}
          />
        );
      })}
    </div>
  );
};
