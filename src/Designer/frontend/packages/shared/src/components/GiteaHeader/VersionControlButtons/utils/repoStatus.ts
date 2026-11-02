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

// Ignored files are never shared. Commits that were not pushed are shared with the next share, and a branch that is not
// on Gitea has no count but is published by the next share.
export const hasChangesToShare = (repoStatus: RepoStatus): boolean =>
  repoStatus.contentStatus.some((file) => file.fileStatus !== 'Ignored') ||
  repoStatus.aheadBy !== 0;
