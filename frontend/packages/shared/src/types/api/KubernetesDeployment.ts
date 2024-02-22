import type { KubernetesDeploymentStatus } from './KubernetesDeploymentStatus';

export interface KubernetesDeployment {
  envName: string;
  release: string;
  version: string;
  status?: KubernetesDeploymentStatus;
  available: boolean;
  availabilityPercentage: number;
}
