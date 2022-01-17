import * as React from 'react';
import { GridSortModel } from '@mui/x-data-grid';
import { Typography } from '@material-ui/core';

import { RepoList } from 'common/components/RepoList';
import { useGetSearchQuery } from 'services/repoApi';
import { useGetOrganizationsQuery } from 'services/organizationApi';
import { useAppSelector, useAppDispatch } from 'common/hooks';
import { useGetUserStarredReposQuery } from 'services/userApi';
import { DashboardActions } from '../../resources/fetchDashboardResources/dashboardSlice';

import { useAugmentReposWithStarred } from './hooks';
import { getUidFilter, getReposLabel } from './utils';

const rowsPerPageOptions = [5, 10, 20, 50, 100];

export const OrgReposList = () => {
  const dispatch = useAppDispatch();
  const pageSize = useAppSelector((state) => state.dashboard.repoRowsPerPage);
  const language = useAppSelector((state) => state.language.language);
  const selectedContext = useAppSelector(
    (state) => state.dashboard.selectedContext,
  );
  const userId = useAppSelector((state) => state.dashboard.user.id);
  const { data: orgs = [] } = useGetOrganizationsQuery()
  const [page, setPage] = React.useState(0);
  const uid = getUidFilter({ selectedContext, userId });

  const [sortModel, setSortModel] = React.useState<GridSortModel>([
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

  const handlePageChange = (newPageNumber: number) => {
    setPage(newPageNumber);
  };

  const handleSortModelChange = (newSortModel: GridSortModel) => {
    setSortModel(newSortModel);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    dispatch(
      DashboardActions.repoRowsPerPageChanged({
        repoRowsPerPage: newPageSize,
      }),
    );
  };

  return (
    <div>
      <Typography variant='h2'>
        {getReposLabel({ selectedContext, orgs, language })}
      </Typography>
      <RepoList
        repos={reposWithStarred}
        isLoading={isLoadingOrgRepos || isLoadingStarred}
        onPageSizeChange={handlePageSizeChange}
        isServerSort={true}
        rowCount={repos?.totalCount}
        onPageChange={handlePageChange}
        onSortModelChange={handleSortModelChange}
        sortModel={sortModel}
        rowsPerPageOptions={rowsPerPageOptions}
        pageSize={pageSize}
      />
    </div>
  );
};
