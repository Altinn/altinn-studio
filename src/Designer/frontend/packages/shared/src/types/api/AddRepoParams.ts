import type { DataModelFormat } from 'app-shared/types/DataModelFormat';

export interface AddRepoParams {
  org: string;
  repository: string;
  dataModellingPreference: DataModelFormat;
}
