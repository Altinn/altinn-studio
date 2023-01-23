import { useMemo } from 'react';
import type { MergeReposProps } from '../../utils/repoUtils';
import { mergeRepos } from '../../utils/repoUtils';
import type { IRepository } from 'app-shared/types/global';

export const useAugmentReposWithStarred = ({
  repos,
  starredRepos,
}: MergeReposProps): IRepository[] => {
  return useMemo(() => {
    return mergeRepos({ repos, starredRepos });
  }, [repos, starredRepos]);
};
