import React from 'react';
import { RepoList } from '../RepoList';
import { useTranslation } from 'react-i18next';
import { useStarredReposQuery } from '../../hooks/queries';
import { Heading } from '@digdir/design-system-react';

export const FavoriteReposList = () => {
  const { t } = useTranslation();
  const { data: userStarredRepos, isPending: areUserStarredReposPending } = useStarredReposQuery();

  return (
    <div>
      <Heading level={2} size='small' spacing>
        {t('dashboard.favourites')}
      </Heading>
      <RepoList
        repos={userStarredRepos}
        isLoading={areUserStarredReposPending}
        pageSize={5}
        rowCount={userStarredRepos?.length ?? 0}
      />
    </div>
  );
};
