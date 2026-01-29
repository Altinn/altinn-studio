import type {
  Branch,
  CurrentBranchInfo,
  RepoStatus,
  UncommittedChangesError,
} from 'app-shared/types/api/BranchTypes';

export const currentBranchInfoMock: CurrentBranchInfo = {
  branchName: 'master',
  commitSha: 'test-sha',
  isTracking: true,
  remoteName: 'origin/master',
};

export const branchesMock: Array<Branch> = [
  {
    name: 'master',
    commit: {
      id: 'test-sha',
      message: 'test-message',
    },
  },
  {
    name: 'feature-branch',
    commit: {
      id: 'test-sha',
      message: 'test-message',
    },
  },
];

export const mockBranch: Branch = {
  name: 'feature/new-branch',
  commit: {
    id: 'commit-id-123',
    message: 'test commit',
  },
};

export const mockRepoStatus: RepoStatus = {
  repositoryStatus: 'Ok',
  aheadBy: 0,
  behindBy: 0,
  contentStatus: [],
  hasMergeConflict: false,
  currentBranch: 'feature/new-branch',
};

export const uncommittedChangesErrorMock: UncommittedChangesError = {
  error: 'UncommittedChanges',
  message: 'You have uncommitted changes',
  uncommittedFiles: [
    {
      filePath: 'test.txt',
      status: 'Modified',
    },
    {
      filePath: 'another.ts',
      status: 'Added',
    },
  ],
  currentBranch: 'main',
  targetBranch: 'feature/new-branch',
};
