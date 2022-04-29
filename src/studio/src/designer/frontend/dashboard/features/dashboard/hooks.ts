import React from 'react';
import { mergeRepos, MergeReposProps } from './utils';
import type { IRepository } from 'app-shared/types/global';

export const useAugmentReposWithStarred = ({
  repos,
  starredRepos,
}: MergeReposProps): IRepository[] => {
  return React.useMemo(() => {
    return mergeRepos({ repos, starredRepos });
  }, [repos, starredRepos]);
};
