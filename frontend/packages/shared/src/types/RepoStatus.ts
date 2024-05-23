export interface RepoStatus {
  aheadBy: number;
  behindBy: number;
  contentStatus: any[];
  hasMergeConflict: boolean;
  repositoryStatus: string | RepositoryStatus;
}

export type RepositoryStatus = 'Ok' | 'CheckoutConflict' | 'MergeConflict';
