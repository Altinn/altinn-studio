import React from 'react';
import { RepoList } from '../RepoList';
import { useTranslation } from 'react-i18next';
import { useStarredReposQuery } from '../../hooks/queries';

export const FavoriteReposList = () => {
  const { t } = useTranslation();
  const { data: userStarredRepos, isLoading: isLoadingUserStarredRepos } = useStarredReposQuery();

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
