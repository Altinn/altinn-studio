import type { KubernetesDeployment } from './KubernetesDeployment';
import type { PipelineDeployment } from './PipelineDeployment';

export interface DeploymentsResponse {
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeploymentList: KubernetesDeployment[];
}
