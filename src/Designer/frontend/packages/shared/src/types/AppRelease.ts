import type { Build } from 'app-shared/types/Build';

export interface AppRelease {
  id: string;
  tagName: string;
  name: string;
  body: string;
  app: string;
  org: string;
  targetCommitish: string;
  createdBy: string;
  created: string;
  build: Build;
}
