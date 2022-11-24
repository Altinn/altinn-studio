import { useMemo } from 'react';
import type { MergeReposProps } from './utils';
import { mergeRepos } from './utils';
import type { IRepository } from 'app-shared/types/global';

export const useAugmentReposWithStarred = ({
  repos,
  starredRepos,
}: MergeReposProps): IRepository[] => {
  return useMemo(() => {
    return mergeRepos({ repos, starredRepos });
  }, [repos, starredRepos]);
};
