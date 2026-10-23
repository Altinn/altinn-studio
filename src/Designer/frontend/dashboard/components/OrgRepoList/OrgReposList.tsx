import { RepoList } from '../RepoList';
import { getReposLabel } from '../../utils/repoUtils';
import { getUidFilter } from '../../utils/filterUtils';
import { useTranslation } from 'react-i18next';
import type { User } from 'app-shared/types/Repository';
import type { Organization } from 'app-shared/types/Organization';
import { useReposSearch } from 'dashboard/hooks/useReposSearch';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { StudioHeading } from '@studio/components';
import { DATAGRID_DEFAULT_PAGE_SIZE } from 'dashboard/constants';
import { useAugmentReposWithStarred } from 'dashboard/hooks/useAugmentReposWithStarred';
import { useStarredReposQuery } from 'dashboard/hooks/queries';
import { TableSortStorageKey } from '../../types/TableSortStorageKey';

type OrgReposListProps = {
  user: User;
  organizations: Organization[];
};

export const OrgReposList = ({ user, organizations }: OrgReposListProps) => {
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();
  const uid = getUidFilter({ selectedContext, userId: user.id, organizations });

  const {
    searchResults: repoResults,
    isLoadingSearchResults: hasPendingRepos,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    onSortClick,
    sortDirection,
    sortColumn,
  } = useReposSearch({
    uid: uid as number,
    excludeNonAppRepos: true,
    defaultPageSize: DATAGRID_DEFAULT_PAGE_SIZE,
    storageKey: TableSortStorageKey.OrgRepos,
  });

  const { data: starredRepos = [], isPending: hasPendingStarredRepos } = useStarredReposQuery();
  const reposIncludingStarredData = useAugmentReposWithStarred({
    repos: repoResults?.data,
    starredRepos,
  });

  return (
    <div>
      <StudioHeading level={2} data-size='md' spacing>
        {getReposLabel({ selectedContext, orgs: organizations, t })}
      </StudioHeading>
      <RepoList
        repos={reposIncludingStarredData}
        isLoading={hasPendingRepos || hasPendingStarredRepos}
        isServerSort={true}
        totalRows={repoResults?.totalCount ?? 0}
        totalPages={repoResults?.totalPages ?? 0}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        pageNumber={pageNumber}
        onPageChange={setPageNumber}
        onSortClick={onSortClick}
        sortDirection={sortDirection}
        sortColumn={sortColumn}
      />
    </div>
  );
};
