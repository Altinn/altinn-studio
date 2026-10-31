import { type RepoStatus } from 'app-shared/types/RepoStatus';

export const isMergeConflict = (repoStatus: RepoStatus): boolean =>
  repoStatus.hasMergeConflict || repoStatus.repositoryStatus === 'MergeConflict';

export const isCheckoutConflict = (repoStatus: RepoStatus): boolean =>
  repoStatus.repositoryStatus === 'CheckoutConflict';

export const toMergeConflictRepoStatus = (repoStatus: RepoStatus): RepoStatus => ({
  ...repoStatus,
  hasMergeConflict: true,
  repositoryStatus: 'MergeConflict',
});
