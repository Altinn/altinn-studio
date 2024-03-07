import React from 'react';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import type { Environment } from 'app-shared/types/Environment';
import { AppStatus } from './AppStatus';
import classes from './AppEnvironments.module.css';
import { getAppLink } from 'app-shared/ext-urls';
import type { AppDeployment } from 'app-shared/types/api/AppDeployment';

export interface AppEnvironmentsProps {
  orgEnvironmentList: Environment[];
  appDeployment: AppDeployment;
}

export const AppEnvironments = ({ orgEnvironmentList, appDeployment }: AppEnvironmentsProps) => {
  const { org, app } = useStudioUrlParams();

  return (
    <div className={classes.appEnvironments}>
      {orgEnvironmentList.map((orgEnvironment: Environment) => {
        const kubernetesDeployment = appDeployment.kubernetesDeploymentList.find(
          (item) => item.envName.toLowerCase() === orgEnvironment.name.toLowerCase(),
        );
        return (
          <AppStatus
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
