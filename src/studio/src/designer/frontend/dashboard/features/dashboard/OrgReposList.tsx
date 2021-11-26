import * as React from 'react';

import { RepoList } from 'common/components/RepoList';
import { useGetOrganizationReposQuery } from 'services/organizationApi';

export const OrgReposList = () => {
  const { data: orgRepos, isLoading: isLoadingOrgRepos } =
    useGetOrganizationReposQuery('hakonb-org2');

  return (
    <div>
      <h1>Org repos</h1>
      <RepoList repos={orgRepos} isLoading={isLoadingOrgRepos} />
    </div>
  );
};
