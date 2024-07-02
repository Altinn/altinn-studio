import { type RepoStatus } from 'app-shared/types/RepoStatus';
import { type VersionControlButtonsContextProps } from '../../context/VersionControlButtonsContext';

export const mockRepoStatus: RepoStatus = {
  aheadBy: 0,
  behindBy: 0,
  contentStatus: [],
  hasMergeConflict: false,
  repositoryStatus: '',
};

export const mockVersionControlButtonsContextValue: VersionControlButtonsContextProps = {
  isLoading: false,
  setIsLoading: jest.fn(),
  hasPushRights: false,
  hasMergeConflict: false,
  setHasMergeConflict: jest.fn(),
  repoStatus: mockRepoStatus,
  commitAndPushChanges: jest.fn(),
  onPullSuccess: jest.fn(),
};
