import React from 'react';
import { Typography } from '@mui/material';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useAppSelector } from '../../common/hooks';
import { useGetUserStarredReposQuery } from '../../services/userApi';
import { RepoList } from '../../common/components/RepoList';

export const FavoriteReposList = () => {
  const language = useAppSelector((state) => state.language.language);
  const { data: userStarredRepos, isLoading: isLoadingUserStarredRepos } =
    useGetUserStarredReposQuery();

  return (
    <div>
      <Typography variant='h2'>
        {getLanguageFromKey('dashboard.favourites', language)}
      </Typography>

      <RepoList
        repos={userStarredRepos}
        isLoading={isLoadingUserStarredRepos}
        pageSize={5}
        rowCount={userStarredRepos?.length ?? 0}
      />
    </div>
  );
};
