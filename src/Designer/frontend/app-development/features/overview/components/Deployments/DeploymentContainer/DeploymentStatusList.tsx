import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { Environment } from 'app-shared/types/Environment';
import { DeploymentStatus } from './DeploymentStatus';
import classes from './DeploymentStatusList.module.css';
import { getAppLink } from 'app-shared/ext-urls';
import type { RunningDeployment } from 'app-shared/types/api/RunningDeployment';
import { PROD_ENV_TYPE } from 'app-shared/constants';
import {
  findRunningPipelineDeployment,
  getDeployStatus,
  type PipelineDeployment,
} from 'app-shared/types/api/PipelineDeployment';
import { BuildResult } from 'app-shared/types/Build';

export interface DeploymentStatusListProps {
  orgEnvironmentList: Environment[];
  runningDeploymentList: RunningDeployment[];
  pipelineDeploymentList: PipelineDeployment[];
}

export const DeploymentStatusList = ({
  orgEnvironmentList,
  runningDeploymentList,
  pipelineDeploymentList,
}: DeploymentStatusListProps) => {
  const { org, app } = useStudioEnvironmentParams();

  return (
    <div className={classes.container}>
      {orgEnvironmentList.map((orgEnvironment: Environment) => {
        const pipelineDeploymentEnvList = pipelineDeploymentList.filter(
          (item) => item.envName.toLowerCase() === orgEnvironment.name.toLowerCase(),
        );
        const runningDeployment = runningDeploymentList.find(
          (item) => item.envName.toLowerCase() === orgEnvironment.name.toLowerCase(),
        );
        const lastPipelineDeployment = pipelineDeploymentEnvList[0];
        const deploymentStatus = getDeployStatus(lastPipelineDeployment);
        const isDeploymentInProgress = deploymentStatus === BuildResult.none;

        return (
          <DeploymentStatus
            deploymentType={lastPipelineDeployment?.deploymentType}
            key={orgEnvironment.name}
            runningDeployment={runningDeployment}
            isDeploymentInProgress={isDeploymentInProgress}
            lastPublishedDate={
              findRunningPipelineDeployment(pipelineDeploymentEnvList, runningDeployment)?.build
                ?.finished
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
