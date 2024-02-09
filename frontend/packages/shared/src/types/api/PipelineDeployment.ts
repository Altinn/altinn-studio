import type { PipelineDeploymentBuild } from './PipelineDeploymentBuild';

export interface PipelineDeployment {
  id: string;
  tagName: string;
  app: string;
  org: string;
  envName: string;
  createdBy: string;
  created: string;
  build: PipelineDeploymentBuild;
}
