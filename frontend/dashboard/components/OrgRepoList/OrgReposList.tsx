import React from 'react';
import { RepoList } from '../RepoList';
import { getReposLabel } from '../../utils/repoUtils';
import { getUidFilter } from '../../utils/filterUtils';
import { useAugmentReposWithStarred } from '../../hooks/useAugmentReposWithStarred';
import { useTranslation } from 'react-i18next';
import { User } from 'dashboard/services/userService';
import { Organization } from 'dashboard/services/organizationService';
import { IRepository } from 'app-shared/types/global';
import { useReposSearch } from 'dashboard/hooks/useReposSearch';
import { useAppContext } from '../../contexts/appContext';

const rowsPerPageOptions = [5, 10, 20, 50, 100];

type OrgReposListProps = {
  user: User;
  organizations: Organization[];
  starredRepos: IRepository[];
};
export const OrgReposList = ({ user, organizations, starredRepos }: OrgReposListProps) => {
  const { selectedContext } = useAppContext();
  const { t } = useTranslation();
  const uid = getUidFilter({ selectedContext, userId: user.id });

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
    <div data-testid='org-repos-list'>
      <h2>{getReposLabel({ selectedContext, orgs: organizations, t })}</h2>
      <RepoList
        repos={reposWithStarred.filter((repo) => !repo.name.endsWith('-datamodels'))}
        isLoading={isLoadingSearchResults}
        onPageSizeChange={setPageSize}
        isServerSort={true}
        rowCount={searchResults?.totalCount ?? 0}
        onPageChange={setPageNumber}
        onSortModelChange={setSortModel}
        sortModel={sortModel}
        rowsPerPageOptions={rowsPerPageOptions}
        pageSize={pageSize}
      />
    </div>
  );
};
