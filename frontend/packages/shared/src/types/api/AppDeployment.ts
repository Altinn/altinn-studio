import type { KubernetesDeployment } from './KubernetesDeployment';
import type { PipelineDeployment } from './PipelineDeployment';

export interface AppDeployment {
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeploymentList: KubernetesDeployment[];
}
