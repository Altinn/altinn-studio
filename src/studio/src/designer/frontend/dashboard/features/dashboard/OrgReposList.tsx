import * as React from 'react';
import { GridSortModel } from '@mui/x-data-grid';

import { RepoList } from 'common/components/RepoList';
import { useGetSearchQuery } from 'services/repoApi';
import {
  useGetOrganizationsQuery,
  Organizations,
} from 'services/organizationApi';
import { useAppSelector } from 'common/hooks';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { SelectedContext } from '../../resources/fetchDashboardResources/dashboardSlice';
import { useGetUserStarredReposQuery } from 'services/userApi';
import { IRepository } from 'app-shared/types';

type GetUidFilter = {
  userId: number;
  selectedContext: SelectedContext;
};

const getUidFilter = ({ selectedContext, userId }: GetUidFilter) => {
  if (selectedContext === SelectedContextType.All) {
    return undefined;
  }

  if (selectedContext === SelectedContextType.Self) {
    return userId;
  }

  return selectedContext;
};

type GetReposLabel = {
  selectedContext: SelectedContext;
  orgs: Organizations;
};

const getReposLabel = ({ selectedContext, orgs }: GetReposLabel) => {
  if (selectedContext === SelectedContextType.All) {
    return 'Alle applikasjoner';
  }

  if (selectedContext === SelectedContextType.Self) {
    return 'Mine applikasjoner';
  }

  return `${
    orgs.find((org) => org.id === selectedContext).full_name
  } applikasjoner`;
};

const setUserHasStarreOnRepos = (
  orgs: IRepository[],
  starred: IRepository[],
): IRepository[] => {
  return orgs?.map((org) => {
    return {
      ...org,
      user_has_starred: starred?.find((o) => o.id === org.id) ? true : false,
    };
  });
};

export const OrgReposList = () => {
  const selectedContext = useAppSelector(
    (state) => state.dashboard.selectedContext,
  );
  const userId = useAppSelector((state) => state.dashboard.user.id);
  const { data: orgs } = useGetOrganizationsQuery();
  const [page, setPage] = React.useState(0);

  const [sortModel, setSortModel] = React.useState<GridSortModel>([
    { field: 'alpha', sort: 'asc' },
  ]);

  const { data: starred, isLoading: isLoadingStarred } =
    useGetUserStarredReposQuery();

  const uid = getUidFilter({ selectedContext, userId });

  const { data, isLoading: isLoadingOrgRepos } = useGetSearchQuery({
    uid,
    page: page + 1,
    sortby: sortModel?.[0]?.field,
    order: sortModel?.[0]?.sort,
  });

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  const handleSortModelChange = (newSortModel: GridSortModel) => {
    setSortModel(newSortModel);
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.13rem' }}>
        {getReposLabel({ selectedContext, orgs })}
      </h1>
      <RepoList
        repos={setUserHasStarreOnRepos(data?.data, starred)}
        isLoading={isLoadingOrgRepos || isLoadingStarred}
        isServerSort={true}
        rowCount={data?.totalCount}
        onPageChange={handlePageChange}
        onSortModelChange={handleSortModelChange}
        sortModel={sortModel}
      />
    </div>
  );
};
