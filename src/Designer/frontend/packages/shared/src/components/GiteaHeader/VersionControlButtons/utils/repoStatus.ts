import { type RepoStatus } from 'app-shared/types/RepoStatus';

export const hasRepoMergeConflict = (repoStatus?: Partial<RepoStatus>): boolean =>
  Boolean(repoStatus?.hasMergeConflict || repoStatus?.repositoryStatus === 'MergeConflict');

export const hasCheckoutConflict = (repoStatus?: Partial<RepoStatus>): boolean =>
  repoStatus?.repositoryStatus === 'CheckoutConflict';
