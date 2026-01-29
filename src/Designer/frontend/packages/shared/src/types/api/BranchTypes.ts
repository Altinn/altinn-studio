export interface Branch {
  name: string;
  commit: {
    id: string;
    message: string;
  };
}

export interface CurrentBranchInfo {
  branchName: string;
  commitSha: string;
  isTracking: boolean;
  remoteName: string | null;
}

export interface CreateBranchRequest {
  branchName: string;
}

export interface CheckoutBranchRequest {
  branchName: string;
}

export interface UncommittedFile {
  filePath: string;
  status: string;
}

export interface UncommittedChangesError {
  error: string;
  message: string;
  uncommittedFiles: UncommittedFile[];
  currentBranch: string;
  targetBranch: string;
}

export interface RepoStatus {
  behindBy?: number;
  aheadBy?: number;
  contentStatus: Array<{
    filePath: string;
    fileStatus: string;
  }>;
  repositoryStatus: string;
  hasMergeConflict: boolean;
  currentBranch: string;
}
