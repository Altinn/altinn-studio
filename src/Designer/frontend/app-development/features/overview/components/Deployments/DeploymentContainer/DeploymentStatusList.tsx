import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { Environment } from 'app-shared/types/Environment';
import { DeploymentStatus } from './DeploymentStatus';
import classes from './DeploymentStatusList.module.css';
import { getAppLink } from 'app-shared/ext-urls';
import type { AppInEnvironment } from 'app-shared/types/api/RunningApp';
import { PROD_ENV_TYPE } from 'app-shared/constants';
import { getDeployStatus, type PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import { BuildResult } from 'app-shared/types/Build';

export interface DeploymentStatusListProps {
  orgEnvironmentList: Environment[];
  environmentList: AppInEnvironment[];
  pipelineDeploymentList: PipelineDeployment[];
}

export const DeploymentStatusList = ({
  orgEnvironmentList,
  environmentList,
  pipelineDeploymentList,
}: DeploymentStatusListProps) => {
  const { org, app } = useStudioEnvironmentParams();

  return (
    <div className={classes.container}>
      {orgEnvironmentList.map((orgEnvironment: Environment) => {
        const pipelineDeploymentEnvList = pipelineDeploymentList.filter(
          (item) => item.envName.toLowerCase() === orgEnvironment.name.toLowerCase(),
        );
        const appInEnvironment = environmentList.find(
          (item) => item.environment.toLowerCase() === orgEnvironment.name.toLowerCase(),
        );
        const lastPipelineDeployment = pipelineDeploymentEnvList[0];
        const deploymentStatus = getDeployStatus(lastPipelineDeployment);
        const isDeploymentInProgress = deploymentStatus === BuildResult.none;

        return (
          <DeploymentStatus
            deploymentType={lastPipelineDeployment?.deploymentType}
            key={orgEnvironment.name}
            runningApp={appInEnvironment?.runningApp ?? undefined}
            isDeploymentInProgress={isDeploymentInProgress}
            isStatusUnknown={appInEnvironment?.state === 'unknown'}
            envName={orgEnvironment.name}
            isProduction={orgEnvironment.type.toLowerCase() === PROD_ENV_TYPE}
            urlToApp={getAppLink(orgEnvironment.appPrefix, orgEnvironment.hostname, org, app)}
          />
        );
      })}
    </div>
  );
};
