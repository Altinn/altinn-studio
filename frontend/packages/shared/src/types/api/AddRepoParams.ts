import type { DatamodelFormat } from 'app-shared/types/DatamodelFormat';

export interface AddRepoParams {
  org: string;
  repository: string;
  datamodellingPreference: DatamodelFormat;
}
