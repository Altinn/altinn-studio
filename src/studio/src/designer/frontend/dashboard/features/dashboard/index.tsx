import * as React from 'react';

import { RepoList } from 'common/components/RepoList';
import { useGetOrganizationReposQuery } from 'services/organizationApi';
import {
  useGetUserReposQuery,
  useGetUserStarredReposQuery,
} from 'services/userApi';

export const Dashboard = () => {
  const { data: userRepos, isLoading: isLoadingUserRepos } =
    useGetUserReposQuery();
  const { data: userStarredRepos, isLoading: isLoadingUserStarredRepos } =
    useGetUserStarredReposQuery();
  const { data: orgRepos, isLoading: isLoadingOrgRepos } =
    useGetOrganizationReposQuery('hakonb-org2');

  console.log('orgRepos', orgRepos);
  console.log('userStarredRepos', userStarredRepos);

  return (
    <div style={{ marginTop: '100px' }}>
      <h1>Fav repos</h1>
      <RepoList
        repos={userStarredRepos}
        isLoading={isLoadingUserStarredRepos}
      />

      <h1>User repos</h1>
      <RepoList repos={userRepos} isLoading={isLoadingUserRepos} />

      <h1>Org repos</h1>
      <RepoList repos={orgRepos} isLoading={isLoadingOrgRepos} />
    </div>
  );
};
