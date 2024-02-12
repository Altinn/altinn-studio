import type { KubernetesDeployment } from './KubernetesDeployment';
import type { PipelineDeployment } from './PipelineDeployment';

export interface AppDeployment {
  envName: string;
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeployment?: KubernetesDeployment;
}
