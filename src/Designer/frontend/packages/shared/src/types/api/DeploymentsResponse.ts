import type { RunningApp } from './RunningApp';
import type { PipelineDeployment } from './PipelineDeployment';

export interface DeploymentsResponse {
  pipelineDeploymentList: PipelineDeployment[];
  runningAppList: RunningApp[];
}
