import { useMemo } from 'react';
import type { MergeReposProps } from '../../utils/repoUtils';
import { mergeRepos } from '../../utils/repoUtils';
import type { RepoIncludingStarredData } from '../../utils/repoUtils/repoUtils';

export const useAugmentReposWithStarred = ({
  repos,
  starredRepos,
}: MergeReposProps): RepoIncludingStarredData[] => {
  return useMemo(() => {
    return mergeRepos({ repos, starredRepos });
  }, [repos, starredRepos]);
};
