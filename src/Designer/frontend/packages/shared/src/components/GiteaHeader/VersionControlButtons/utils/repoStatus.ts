import { type RepoStatus } from 'app-shared/types/RepoStatus';

export const hasRepoMergeConflict = (repoStatus?: Partial<RepoStatus>): boolean =>
  Boolean(repoStatus?.hasMergeConflict || repoStatus?.repositoryStatus === 'MergeConflict');

export const hasCheckoutConflict = (repoStatus?: Partial<RepoStatus>): boolean =>
  repoStatus?.repositoryStatus === 'CheckoutConflict';

export const toMergeConflictRepoStatus = (repoStatus?: Partial<RepoStatus>): RepoStatus => ({
  ...repoStatus,
  hasMergeConflict: true,
  repositoryStatus: 'MergeConflict',
  contentStatus: repoStatus?.contentStatus ?? [],
  aheadBy: repoStatus?.aheadBy ?? 0,
  behindBy: repoStatus?.behindBy ?? 0,
});
