import type { AppInEnvironment } from './RunningApp';
import type { PipelineDeployment } from './PipelineDeployment';

export interface DeploymentsResponse {
  pipelineDeploymentList: PipelineDeployment[];
  /** What runs of the app in each of the org's environments. Missing from a backend older than this frontend. */
  environmentList?: AppInEnvironment[];
}
