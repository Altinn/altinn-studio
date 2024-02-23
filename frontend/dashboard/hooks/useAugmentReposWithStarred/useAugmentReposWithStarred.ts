import { useMemo } from 'react';
import { mergeRepos, type MergeReposProps } from '../../utils/repoUtils';
import type { RepositoryWithStarred } from 'dashboard/utils/repoUtils/repoUtils';

export const useAugmentReposWithStarred = ({
  repos,
  starredRepos,
}: MergeReposProps): RepositoryWithStarred[] => {
  return useMemo(() => {
    return mergeRepos({ repos, starredRepos });
  }, [repos, starredRepos]);
};
