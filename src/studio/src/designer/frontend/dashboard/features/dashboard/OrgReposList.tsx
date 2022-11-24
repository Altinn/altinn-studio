import React, { useState } from 'react';
import { GridSortModel } from '@mui/x-data-grid';
import { DashboardActions } from '../../resources/fetchDashboardResources/dashboardSlice';
import { useAugmentReposWithStarred } from './hooks';
import { getReposLabel, getUidFilter } from './utils';
import { useAppDispatch, useAppSelector } from '../../common/hooks';
import { useGetOrganizationsQuery } from '../../services/organizationApi';
import { useGetUserStarredReposQuery } from '../../services/userApi';
import { useGetSearchQuery } from '../../services/repoApi';
import { RepoList } from '../../common/components/RepoList';

const rowsPerPageOptions = [5, 10, 20, 50, 100];

export const OrgReposList = () => {
  const dispatch = useAppDispatch();
  const pageSize = useAppSelector((state) => state.dashboard.repoRowsPerPage);
  const language = useAppSelector((state) => state.language.language);
  const selectedContext = useAppSelector(
    (state) => state.dashboard.selectedContext
  );
  const userId = useAppSelector((state) => state.dashboard.user.id);
  const { data: orgs = [] } = useGetOrganizationsQuery();
  const [page, setPage] = useState(0);
  const uid = getUidFilter({ selectedContext, userId });
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'name', sort: 'asc' },
  ]);
  const { data: starredRepos, isLoading: isLoadingStarred } =
    useGetUserStarredReposQuery();
  const { data: repos, isLoading: isLoadingOrgRepos } = useGetSearchQuery({
    uid,
    page: page,
    sortby: sortModel?.[0]?.field,
    order: sortModel?.[0]?.sort,
    limit: pageSize,
  });
  const reposWithStarred = useAugmentReposWithStarred({
    repos: repos?.data,
    starredRepos,
  });
  const handlePageChange = (newPageNumber: number) => setPage(newPageNumber);
  const handleSortModelChange = (newSortModel: GridSortModel) =>
    setSortModel(newSortModel);
  const handlePageSizeChange = (newPageSize: number) =>
    dispatch(
      DashboardActions.repoRowsPerPageChanged({
        repoRowsPerPage: newPageSize,
      })
    );

  return (
    <div>
      <h2>{getReposLabel({ selectedContext, orgs, language })}</h2>
      <RepoList
        repos={reposWithStarred.filter((repo) => !repo.name.endsWith('-datamodels'))}
        isLoading={isLoadingOrgRepos || isLoadingStarred}
        onPageSizeChange={handlePageSizeChange}
        isServerSort={true}
        rowCount={repos?.totalCount ?? 0}
        onPageChange={handlePageChange}
        onSortModelChange={handleSortModelChange}
        sortModel={sortModel}
        rowsPerPageOptions={rowsPerPageOptions}
        pageSize={pageSize}
      />
    </div>
  );
};
