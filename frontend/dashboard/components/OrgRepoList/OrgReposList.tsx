import React from 'react';
import { RepoList } from '../RepoList';
import { getReposLabel } from '../../utils/repoUtils';
import { getUidFilter } from '../../utils/filterUtils';
import { useAugmentReposWithStarred } from '../../hooks/useAugmentReposWithStarred';
import { useTranslation } from 'react-i18next';
import { User } from 'app-shared/types/User';
import { Organization } from 'app-shared/types/Organization';
import { IRepository } from 'app-shared/types/global';
import { useReposSearch } from 'dashboard/hooks/useReposSearch';
import { DATAGRID_ROWS_PER_PAGE_OPTIONS } from '../../constants';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { Heading } from '@digdir/design-system-react';

type OrgReposListProps = {
  user: User;
  organizations: Organization[];
  starredRepos: IRepository[];
};
export const OrgReposList = ({ user, organizations, starredRepos }: OrgReposListProps) => {
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
  } = useReposSearch({ uid: uid as number, defaultPageSize: 5 });

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
        isLoading={isLoadingSearchResults}
        onPageSizeChange={setPageSize}
        isServerSort={true}
        rowCount={searchResults?.totalCount ?? 0}
        onPageChange={setPageNumber}
        onSortModelChange={setSortModel}
        sortModel={sortModel}
        rowsPerPageOptions={DATAGRID_ROWS_PER_PAGE_OPTIONS}
        pageSize={pageSize}
      />
    </div>
  );
};
