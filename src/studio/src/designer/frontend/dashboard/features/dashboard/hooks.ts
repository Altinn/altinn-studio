import * as React from 'react';
import { IRepository } from 'app-shared/types';

type AugmentReposWithStarred = {
  repos: IRepository[];
  starredRepos: IRepository[];
};

export const useAugmentReposWithStarred = ({
  repos,
  starredRepos,
}: AugmentReposWithStarred): IRepository[] => {
  return React.useMemo(() => {
    return repos?.map((repo) => {
      return {
        ...repo,
        user_has_starred: starredRepos?.find(
          (starredRepo) => starredRepo.id === repo.id,
        )
          ? true
          : false,
      };
    });
  }, [repos, starredRepos]);
};
