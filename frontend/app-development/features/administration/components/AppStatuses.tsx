import React from 'react';
import classes from './AppStatuses.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useEnvironmentsQuery, useOrgListQuery } from 'app-development/hooks/queries';
import { AltinnSpinner } from 'app-shared/components';
import { ICreateAppDeploymentEnvObject } from 'app-development/sharedResources/appDeployment/types';
import { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { AppStatus } from './AppStatus';

export const AppStatuses = () => {
  const { org } = useStudioUrlParams();

  const { data: environmentList = [], isLoading: envIsLoading } = useEnvironmentsQuery();
  const { data: orgs = { orgs: {} }, isLoading: orgsIsLoading } = useOrgListQuery();

  if (envIsLoading || orgsIsLoading) return <AltinnSpinner />;

  const deployEnvironments: ICreateAppDeploymentEnvObject[] = environmentList.filter(
    (env: DeployEnvironment) => orgs?.orgs[org]?.environments.includes(env.name),
  );

  return (
    <div className={classes.appStatuses}>
      {deployEnvironments.map((deployEnvironment: DeployEnvironment) => {
        return (
          <AppStatus
            key={deployEnvironment.name}
            envName={deployEnvironment.name}
            envType={deployEnvironment.type}
          />
        );
      })}
    </div>
  );
};
