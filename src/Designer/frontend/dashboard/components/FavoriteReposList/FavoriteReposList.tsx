import React from 'react';
import { RepoList } from '../RepoList';
import { useTranslation } from 'react-i18next';
import { useStarredReposQuery } from '../../hooks/queries';
import { Heading } from '@digdir/designsystemet-react';
import { TableSortStorageKey } from '../../types/TableSortStorageKey';

export const FavoriteReposList = () => {
  const { t } = useTranslation();
  const { data: userStarredRepos = [], isPending: isPendingStarredRepos } = useStarredReposQuery();

  return (
    <div>
      <Heading level={2} size='small' spacing>
        {t('dashboard.favourites')}
      </Heading>
      <RepoList
        repos={userStarredRepos}
        isLoading={isPendingStarredRepos}
        sortStorageKey={TableSortStorageKey.FavoriteRepos}
      />
    </div>
  );
};
