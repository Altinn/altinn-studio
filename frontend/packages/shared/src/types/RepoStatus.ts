export interface RepoStatus {
  aheadBy: number;
  behindBy: number;
  contentStatus: any[];
  hasMergeConflict: boolean;
  repositoryStatus: string;
}
