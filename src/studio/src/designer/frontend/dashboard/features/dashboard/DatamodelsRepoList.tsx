import React from 'react';

import { RepoList } from '../../common/components/RepoList';
import { useGetSearchQuery } from '../../services/repoApi';
import { useGetOrganizationsQuery } from '../../services/organizationApi';
import { useAppSelector } from '../../common/hooks';
import { useGetUserStarredReposQuery } from '../../services/userApi';

import { useAugmentReposWithStarred } from './hooks';
import { getUidFilter, getReposLabel } from './utils';

export const DatamodelsReposList = () => {
  const language = useAppSelector((state) => state.language.language);
  const selectedContext = useAppSelector((state) => state.dashboard.selectedContext);
  const userId = useAppSelector((state) => state.dashboard.user.id);
  const { data: orgs = [] } = useGetOrganizationsQuery();
  const uid = getUidFilter({ selectedContext, userId });

  const { data: starredRepos, isLoading: isLoadingStarred } = useGetUserStarredReposQuery();

  const { data: repos, isLoading: isLoadingOrgRepos } = useGetSearchQuery({
    uid,
    keyword: '-datamodels',
    page: 0,
  });

  const reposWithStarred = useAugmentReposWithStarred({
    repos: repos?.data,
    starredRepos,
  });

  if (!reposWithStarred.length) {
    return null;
  }

  return (
    <div>
      <h2>{getReposLabel({ selectedContext, orgs, language, isDatamodelsRepo: true })}</h2>
      <RepoList
        repos={reposWithStarred}
        isLoading={isLoadingOrgRepos || isLoadingStarred}
        pageSize={5}
        rowCount={2}
      />
    </div>
  );
};
