import type { KubernetesDeploymentStatus } from './KubernetesDeploymentStatus';

export interface KubernetesDeployment {
  release: string;
  version: string;
  status?: KubernetesDeploymentStatus;
  availabilityPercentage: number;
}
