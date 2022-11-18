import { useMemo } from 'react';
import { mergeRepos, MergeReposProps } from './utils';
import type { IRepository } from 'app-shared/types/global';

export const useAugmentReposWithStarred = ({
  repos,
  starredRepos,
}: MergeReposProps): IRepository[] => {
  return useMemo(() => {
    return mergeRepos({ repos, starredRepos });
  }, [repos, starredRepos]);
};
