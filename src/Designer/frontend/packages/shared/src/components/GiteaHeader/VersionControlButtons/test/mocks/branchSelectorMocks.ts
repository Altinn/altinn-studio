import type {
  Branch,
  CurrentBranchInfo,
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

export const uncommittedChangesErrorMock: UncommittedChangesError = {
  error: 'UncommittedChanges',
  message: 'There are uncommitted changes',
  uncommittedFiles: [
    {
      filePath: 'test-file.txt',
      status: 'Modified',
    },
  ],
  currentBranch: 'master',
  targetBranch: 'feature-branch',
};
