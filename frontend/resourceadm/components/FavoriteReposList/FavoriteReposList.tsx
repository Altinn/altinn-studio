import React from 'react';
import { RepoList } from '../../components/RepoList';
import { useTranslation } from 'react-i18next';
import { useGetStarredRepos } from '../../hooks/useRepoQueries/useRepoQueries';

export const FavoriteReposList = () => {

  const { t } = useTranslation();

  const { data: userStarredRepos, isLoading: isLoadingUserStarredRepos } = useGetStarredRepos();

  return (
    <div data-testid='favorite-repos-list'>
      <h2>{t('dashboard.favourites')}</h2>
      <RepoList
        repos={userStarredRepos}
        isLoading={isLoadingUserStarredRepos}
        pageSize={5}
        rowCount={userStarredRepos?.length ?? 0}
      />
    </div>
  );
};
