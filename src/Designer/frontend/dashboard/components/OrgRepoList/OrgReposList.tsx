import React from 'react';
import { RepoList } from '../RepoList';
import { getReposLabel } from '../../utils/repoUtils';
import { getUidFilter } from '../../utils/filterUtils';
import { useTranslation } from 'react-i18next';
import type { User } from 'app-shared/types/Repository';
import type { Organization } from 'app-shared/types/Organization';
import { useReposSearch } from '../../hooks/useReposSearch';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { Heading } from '@digdir/designsystemet-react';
import { DATA_MODEL_REPO_IDENTIFIER, DATAGRID_DEFAULT_PAGE_SIZE } from '../../constants';
import { useAugmentReposWithStarred } from '../../hooks/useAugmentReposWithStarred';
import { useSearchReposQuery, useStarredReposQuery } from '../../hooks/queries';
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
    defaultPageSize: DATAGRID_DEFAULT_PAGE_SIZE,
    storageKey: TableSortStorageKey.OrgRepos,
  });

  const { data: dataModelsResults, isPending: hasPendingDataModels } = useSearchReposQuery({
    uid: uid as number,
    keyword: DATA_MODEL_REPO_IDENTIFIER,
  });
  const totalRows = repoResults?.totalCount - dataModelsResults?.totalCount || 0;

  const { data: starredRepos = [], isPending: hasPendingStarredRepos } = useStarredReposQuery();
  const reposIncludingStarredData = useAugmentReposWithStarred({
    repos: repoResults?.data,
    starredRepos,
  });

  return (
    <div>
      <Heading level={2} size='small' spacing>
        {getReposLabel({ selectedContext, orgs: organizations, t })}
      </Heading>
      <RepoList
        repos={reposIncludingStarredData.filter(
          (repo) => !repo.name.endsWith(DATA_MODEL_REPO_IDENTIFIER),
        )}
        isLoading={hasPendingRepos || hasPendingStarredRepos || hasPendingDataModels}
        isServerSort={true}
        totalRows={totalRows}
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
