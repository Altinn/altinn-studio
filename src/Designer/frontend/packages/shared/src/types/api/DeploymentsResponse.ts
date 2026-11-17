import type { AppInEnvironment } from './RunningApp';
import type { PipelineDeployment } from './PipelineDeployment';

export interface DeploymentsResponse {
  pipelineDeploymentList: PipelineDeployment[];
  /** What runs of the app in each of the org's environments. */
  environmentList: AppInEnvironment[];
}

/** What runs of the app in each environment, or none before the deployments have loaded. */
export const environmentsOf = (deployments: DeploymentsResponse | undefined): AppInEnvironment[] =>
  deployments?.environmentList ?? [];
