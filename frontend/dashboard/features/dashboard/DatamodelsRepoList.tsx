import React from 'react';
import { RepoList } from '../../common/components/RepoList';
import { getUidFilter, getReposLabel } from './utils';
import { useAppSelector } from '../../common/hooks';
import { useAugmentReposWithStarred } from './hooks';
import { useGetOrganizationsQuery } from '../../services/organizationApi';
import { useGetSearchQuery } from '../../services/repoApi';
import { useGetUserStarredReposQuery } from '../../services/userApi';

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
    <div data-testid='datamodels-repos-list'>
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
