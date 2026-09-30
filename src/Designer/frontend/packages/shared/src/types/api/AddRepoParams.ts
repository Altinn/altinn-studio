import type { CustomTemplateReference } from '../CustomTemplateReference';

export interface AddRepoParams {
  org: string;
  repository: string;
  /** Id of the app scaffold, e.g. "v8". Falls back to the backend default when omitted. */
  appTemplate?: string;
  template?: CustomTemplateReference;
}
