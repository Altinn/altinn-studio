import type { Build } from '../Build';

export interface PipelineDeployment {
  id: string;
  deploymentType: 'Decommission' | 'Deploy';
  tagName: string;
  app: string;
  org: string;
  envName: string;
  createdBy: string;
  created: string;
  build: Build;
}
