import React from 'react';
import { useAugmentReposWithStarred } from '../../hooks/useAugmentReposWithStarred';
import { RepoList } from '../RepoList';
import { useTranslation } from 'react-i18next';
import { useReposSearch } from 'dashboard/hooks/useReposSearch';
import { DATAGRID_ROWS_PER_PAGE_OPTIONS } from '../../constants';
import { IRepository } from 'app-shared/types/global';

type SearchResultReposList = {
  starredRepos: IRepository[];
  searchValue: string;
};
export const SearchResultReposList = ({ starredRepos, searchValue }: SearchResultReposList) => {
  const { t } = useTranslation();
  const { searchResults, isLoadingSearchResults, sortModel, pageSize, setPageNumber, setSortModel, setPageSize } =
    useReposSearch({ keyword: searchValue });

  const reposWithStarred = useAugmentReposWithStarred({
    repos: searchResults?.data,
    starredRepos,
  });

  return (
    <div data-testid='search-result-repos-list'>
      <h2>{t('dashboard.search_result')}</h2>
      <RepoList
        repos={reposWithStarred}
        isLoading={isLoadingSearchResults}
        onPageSizeChange={setPageSize}
        isServerSort={true}
        rowCount={searchResults?.totalCount}
        onPageChange={setPageNumber}
        onSortModelChange={setSortModel}
        sortModel={sortModel}
        pageSize={pageSize}
        rowsPerPageOptions={DATAGRID_ROWS_PER_PAGE_OPTIONS}
      />
    </div>
  );
};
