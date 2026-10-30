import type { RunningDeployment } from './RunningDeployment';
import type { PipelineDeployment } from './PipelineDeployment';

export interface DeploymentsResponse {
  pipelineDeploymentList: PipelineDeployment[];
  runningDeploymentList: RunningDeployment[];
}
