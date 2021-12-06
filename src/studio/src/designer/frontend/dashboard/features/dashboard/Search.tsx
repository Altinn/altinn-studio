import * as React from 'react';
import { GridSortModel } from '@mui/x-data-grid';
import { Typography } from '@material-ui/core';

import { getLanguageFromKey } from 'app-shared/utils/language';
import { IRepository } from 'app-shared/types';

import { useAppSelector } from 'common/hooks';
import { RepoList } from 'common/components/RepoList';
import { useGetSearchQuery } from 'services/repoApi';

import { useGetUserStarredReposQuery } from 'services/userApi';

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
  const language = useAppSelector((state) => state.language.language);
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
      <Typography variant='h2'>
        {getLanguageFromKey('dashboard.search_result', language)}
      </Typography>
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
