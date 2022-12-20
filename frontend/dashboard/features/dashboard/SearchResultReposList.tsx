import React, { useState } from 'react';
import type { GridSortModel } from '@mui/x-data-grid';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useAugmentReposWithStarred } from './hooks';
import { useAppSelector } from '../../common/hooks';
import { useGetUserStarredReposQuery } from '../../services/userApi';
import { useGetSearchQuery } from '../../services/repoApi';
import { RepoList } from '../../common/components/RepoList';

const rowsPerPageOptions = [8];

export const SearchResultReposList = ({ searchValue }: { searchValue: string }) => {
  const language = useAppSelector((state) => state.language.language);
  const [page, setPage] = useState(0);
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'alpha', sort: 'asc' }]);
  const { data: starredRepos, isLoading: isLoadingStarred } = useGetUserStarredReposQuery();

  const { data: repos, isLoading: isLoadingOrgRepos } = useGetSearchQuery({
    keyword: searchValue,
    page: page,
    sortby: sortModel?.[0]?.field,
    order: sortModel?.[0]?.sort,
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

  return (
    <div>
      <h2>{getLanguageFromKey('dashboard.search_result', language)}</h2>
      <RepoList
        repos={reposWithStarred}
        isLoading={isLoadingOrgRepos || isLoadingStarred}
        isServerSort={true}
        rowCount={repos?.totalCount}
        onPageChange={handlePageChange}
        onSortModelChange={handleSortModelChange}
        sortModel={sortModel}
        pageSize={rowsPerPageOptions[0]}
        rowsPerPageOptions={rowsPerPageOptions}
      />
    </div>
  );
};
