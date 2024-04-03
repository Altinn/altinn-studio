import React from 'react';
import { RepoList } from '../RepoList';
import { useTranslation } from 'react-i18next';
import { useStarredReposQuery } from '../../hooks/queries';
import { Heading } from '@digdir/design-system-react';
import { DATAGRID_DEFAULT_PAGE_SIZE } from 'dashboard/constants';

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
        rowCount={userStarredRepos?.length ?? 0}
        pageSizeOptions={[DATAGRID_DEFAULT_PAGE_SIZE]}
      />
    </div>
  );
};
