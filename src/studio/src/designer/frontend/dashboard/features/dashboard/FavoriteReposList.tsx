import * as React from 'react';

import { RepoList } from 'common/components/RepoList';
import { useGetUserStarredReposQuery } from 'services/userApi';

export const FavoriteReposList = () => {
  const { data: userStarredRepos, isLoading: isLoadingUserStarredRepos } =
    useGetUserStarredReposQuery();

  return (
    <div>
      <h1>Favoritter</h1>
      <RepoList
        repos={userStarredRepos}
        isLoading={isLoadingUserStarredRepos}
        pageSize={5}
      />
    </div>
  );
};
