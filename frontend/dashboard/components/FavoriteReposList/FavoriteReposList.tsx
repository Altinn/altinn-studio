import React from 'react';
import { RepoList } from '../RepoList';
import { useTranslation } from 'react-i18next';
import { useStarredReposQuery } from '../../hooks/queries';
import { Heading } from '@digdir/designsystemet-react';
import { useLocalReposSort } from '../../hooks/useLocalReposSort';

export const FavoriteReposList = () => {
  const { t } = useTranslation();
  const { data: userStarredRepos = [], isPending } = useStarredReposQuery();

  const { sortedRepos, handleSortClick } = useLocalReposSort({
    repos: userStarredRepos,
    storageKey: 'dashboard-favorites-sort-order',
  });

  return (
    <div>
      <Heading level={2} size='small' spacing>
        {t('dashboard.favourites')}
      </Heading>
      <RepoList
        repos={sortedRepos}
        isLoading={isPending}
        isServerSort={true}
        onSortClick={handleSortClick}
      />
    </div>
  );
};
