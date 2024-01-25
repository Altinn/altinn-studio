import React from 'react';
import { RepoList } from '../RepoList';
import { getReposLabel } from '../../utils/repoUtils';
import { getUidFilter } from '../../utils/filterUtils';
import { useTranslation } from 'react-i18next';
import type { User } from 'app-shared/types/Repository';
import type { Organization } from 'app-shared/types/Organization';
import { useReposSearch } from 'dashboard/hooks/useReposSearch';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { Heading } from '@digdir/design-system-react';
import { DATAGRID_DEFAULT_PAGE_SIZE } from 'dashboard/constants';
import { useAugmentReposWithStarred } from 'dashboard/hooks/useAugmentReposWithStarred';
import { useStarredReposQuery } from 'dashboard/hooks/queries';

type OrgReposListProps = {
  user: User;
  organizations: Organization[];
};
export const OrgReposList = ({ user, organizations }: OrgReposListProps) => {
  const { data: starredRepos = [], isPending: areStarredReposPending } = useStarredReposQuery();
  const selectedContext = useSelectedContext();
  const { t } = useTranslation();
  const uid = getUidFilter({ selectedContext, userId: user.id, organizations });

  const {
    searchResults,
    isLoadingSearchResults,
    sortModel,
    pageSize,
    setSortModel,
    setPageNumber,
    setPageSize,
  } = useReposSearch({ uid: uid as number, defaultPageSize: DATAGRID_DEFAULT_PAGE_SIZE });

  const reposWithStarred = useAugmentReposWithStarred({
    repos: searchResults?.data,
    starredRepos,
  });

  return (
    <div>
      <Heading level={2} size='small' spacing>
        {getReposLabel({ selectedContext, orgs: organizations, t })}
      </Heading>
      <RepoList
        repos={reposWithStarred.filter((repo) => !repo.name.endsWith('-datamodels'))}
        isLoading={isLoadingSearchResults || areStarredReposPending}
        onPageSizeChange={setPageSize}
        isServerSort={true}
        rowCount={searchResults?.totalCount ?? 0}
        onPageChange={setPageNumber}
        onSortModelChange={setSortModel}
        sortModel={sortModel}
        pageSize={pageSize}
      />
    </div>
  );
};
