import React from 'react';
import { RepoList } from '../../common/components/RepoList';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useAppSelector } from '../../common/hooks';
import { useGetUserStarredReposQuery } from '../../services/userApi';

export const FavoriteReposList = () => {
  const language = useAppSelector((state) => state.language.language);
  const { data: userStarredRepos, isLoading: isLoadingUserStarredRepos } =
    useGetUserStarredReposQuery();
  return (
    <div data-testid='favorite-repos-list'>
      <h2>{getLanguageFromKey('dashboard.favourites', language)}</h2>
      <RepoList
        repos={userStarredRepos}
        isLoading={isLoadingUserStarredRepos}
        pageSize={5}
        rowCount={userStarredRepos?.length ?? 0}
      />
    </div>
  );
};
