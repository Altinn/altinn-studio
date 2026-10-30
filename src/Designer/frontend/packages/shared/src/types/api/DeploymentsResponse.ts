import type { RunningApp } from './RunningApp';
import type { PipelineDeployment } from './PipelineDeployment';

export interface DeploymentsResponse {
  pipelineDeploymentList: PipelineDeployment[];
  /** Missing from a backend older than this frontend, as during a rollout. */
  runningAppList?: RunningApp[];
}
