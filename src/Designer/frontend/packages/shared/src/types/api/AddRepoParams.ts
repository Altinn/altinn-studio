import type { CustomTemplateReference } from '../CustomTemplateReference';

export interface AddRepoParams {
  org: string;
  repository: string;
  templates?: CustomTemplateReference[];
}
