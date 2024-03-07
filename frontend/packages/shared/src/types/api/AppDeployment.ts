import type { KubernetesDeployment } from './KubernetesDeployment';
import type { PipelineDeployment } from './PipelineDeployment';

export interface Deployment {
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeploymentList: KubernetesDeployment[];
}
