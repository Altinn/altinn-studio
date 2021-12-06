import * as React from 'react';
import { Typography } from '@material-ui/core';

import { getLanguageFromKey } from 'app-shared/utils/language';

import { useAppSelector } from 'common/hooks';

import { RepoList } from 'common/components/RepoList';
import { useGetUserStarredReposQuery } from 'services/userApi';

export const FavoriteReposList = () => {
  const language = useAppSelector((state) => state.language.language);
  const { data: userStarredRepos, isLoading: isLoadingUserStarredRepos } =
    useGetUserStarredReposQuery();

  return (
    <div>
      <Typography variant='h2'>
        {getLanguageFromKey('dashboard.favorites', language)}
      </Typography>

      <RepoList
        repos={userStarredRepos}
        isLoading={isLoadingUserStarredRepos}
        pageSize={5}
      />
    </div>
  );
};
