import * as React from 'react';
import { GridSortModel } from '@mui/x-data-grid';

import { RepoList } from 'common/components/RepoList';
import { useGetSearchQuery } from 'services/repoApi';

import { useGetUserStarredReposQuery } from 'services/userApi';
import { IRepository } from 'app-shared/types';

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

export const SearchResult = ({ searchValue }: { searchValue: string }) => {
  const [page, setPage] = React.useState(0);

  const [sortModel, setSortModel] = React.useState<GridSortModel>([
    { field: 'alpha', sort: 'asc' },
  ]);

  const { data: starred, isLoading: isLoadingStarred } =
    useGetUserStarredReposQuery();

  const { data, isLoading: isLoadingOrgRepos } = useGetSearchQuery({
    keyword: searchValue,
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
      <h1 style={{ fontSize: '1.13rem' }}>Søkeresultat</h1>
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
