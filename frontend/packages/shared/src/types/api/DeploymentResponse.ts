import type { KubernetesDeployment } from './KubernetesDeployment';
import type { PipelineDeployment } from './PipelineDeployment';

export interface DeploymentResponse {
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeploymentList: KubernetesDeployment[];
}
