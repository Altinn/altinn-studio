import * as React from 'react';

import { RepoList } from 'common/components/RepoList';
import { useGetUserReposQuery } from 'services/userApi';

export const UserReposList = () => {
  const { data: userRepos, isLoading: isLoadingUserRepos } =
    useGetUserReposQuery();

  return (
    <div>
      <h1>User repos</h1>
      <RepoList repos={userRepos} isLoading={isLoadingUserRepos} />
    </div>
  );
};
