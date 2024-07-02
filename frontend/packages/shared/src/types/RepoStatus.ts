export interface RepoStatus {
  aheadBy: number;
  behindBy: number;
  contentStatus: RepoContentStatus[];
  hasMergeConflict: boolean;
  repositoryStatus: string | RepositoryStatus;
}

export type RepositoryStatus = 'Ok' | 'CheckoutConflict' | 'MergeConflict';

export type RepoContentStatus = {
  filePath: string;
  fileStatus: string;
};
