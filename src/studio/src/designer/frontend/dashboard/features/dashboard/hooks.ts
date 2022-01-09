import * as React from 'react';
import { mergeRepos, MergeReposProps } from './utils';
import { IRepository } from 'app-shared/types';

export const useAugmentReposWithStarred = ({
  repos,
  starredRepos,
}: MergeReposProps): IRepository[] => {
  return React.useMemo(() => {
    return mergeRepos({ repos, starredRepos });
  }, [repos, starredRepos]);
};
