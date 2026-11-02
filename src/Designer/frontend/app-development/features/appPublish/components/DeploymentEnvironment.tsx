import classes from './DeploymentEnvironment.module.css';
import { DeploymentEnvironmentStatus } from './DeploymentEnvironmentStatus';
import { Deploy } from './Deploy';
import { DeploymentEnvironmentLogList } from './DeploymentEnvironmentLogList';
import {
  findRunningPipelineDeployment,
  getDeployStatus,
  type PipelineDeployment,
} from 'app-shared/types/api/PipelineDeployment';
import type { RunningApp } from 'app-shared/types/api/RunningApp';
import { BuildResult } from 'app-shared/types/Build';

export interface DeploymentEnvironmentProps {
  pipelineDeploymentList: PipelineDeployment[];
  runningApp: RunningApp;
  envName: string;
  isProduction: boolean;
  urlToApp?: string;
  orgName: string;
}

export const DeploymentEnvironment = ({
  pipelineDeploymentList,
  runningApp,
  envName,
  isProduction,
  urlToApp,
  orgName,
}: DeploymentEnvironmentProps) => {
  const lastPipelineDeployment = pipelineDeploymentList[0];
  const deploymentStatus = getDeployStatus(lastPipelineDeployment);
  const isDeploymentInProgress = deploymentStatus === BuildResult.none;
  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <DeploymentEnvironmentStatus
          runningApp={runningApp}
          isDeploymentInProgress={isDeploymentInProgress}
          lastPublishedDate={
            findRunningPipelineDeployment(pipelineDeploymentList, runningApp)?.build?.finished
          }
          envName={envName}
          isProduction={isProduction}
          urlToApp={urlToApp}
        />
      </div>
      <div className={classes.content}>
        <Deploy
          appDeployedVersion={runningApp?.version}
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
