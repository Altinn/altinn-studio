import type { Build } from 'app-shared/types/Build';

export interface AppDeployment {
  id: string;
  tagName: string;
  app: string;
  org: string;
  envName: string;
  deployedInEnv: boolean;
  createdBy: string;
  created: string;
  build: Build;
}
