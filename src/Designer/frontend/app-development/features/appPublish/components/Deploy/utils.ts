import type { DeployAppStatus } from 'app-shared/types/AppStatus';
import { isDeployAppStatus } from 'app-shared/types/AppStatus';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';

/**
 * Returns the app status of the latest deploy to the environment, ignoring undeploys.
 * Falls back to the environment default when there is no previous deploy or it has no status.
 * @param pipelineDeploymentList The environment's deployments, newest first.
 * @param isProduction Whether the environment is production.
 */
export const getDefaultAppStatus = (
  pipelineDeploymentList: PipelineDeployment[],
  isProduction: boolean,
): DeployAppStatus => {
  const latestDeploy = pipelineDeploymentList.find(
    (deployment) => deployment.deploymentType === 'Deploy',
  );
  if (isDeployAppStatus(latestDeploy?.appStatus)) return latestDeploy.appStatus;
  return isProduction ? 'Completed' : 'UnderDevelopment';
};
