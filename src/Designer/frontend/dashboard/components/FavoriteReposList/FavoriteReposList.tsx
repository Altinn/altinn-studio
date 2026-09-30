import { RepoList } from '../RepoList';
import { useTranslation } from 'react-i18next';
import { useStarredReposQuery } from '../../hooks/queries';
import { StudioHeading } from '@studio/components';
import { TableSortStorageKey } from '../../types/TableSortStorageKey';

export const FavoriteReposList = () => {
  const { t } = useTranslation();
  const { data: userStarredRepos = [], isPending: isPendingStarredRepos } = useStarredReposQuery();

  return (
    <div>
      <StudioHeading level={2} data-size='md' spacing>
        {t('dashboard.favorites')}
      </StudioHeading>
      <RepoList
        repos={userStarredRepos}
        isLoading={isPendingStarredRepos}
        sortStorageKey={TableSortStorageKey.FavoriteRepos}
      />
    </div>
  );
};
