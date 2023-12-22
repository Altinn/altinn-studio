import React from 'react';
import { RepoList } from '../RepoList';
import { useTranslation } from 'react-i18next';
import { useReposSearch } from 'dashboard/hooks/useReposSearch';
import { DATAGRID_ROWS_PER_PAGE_OPTIONS } from '../../constants';

type SearchResultReposList = {
  searchValue: string;
};
export const SearchResultReposList = ({ searchValue }: SearchResultReposList) => {
  const { t } = useTranslation();
  const {
    searchResults,
    isLoadingSearchResults,
    sortModel,
    pageSize,
    setPageNumber,
    setSortModel,
    setPageSize,
  } = useReposSearch({ keyword: searchValue });

  return (
    <div>
      <h2>{t('dashboard.search_result')}</h2>
      <RepoList
        repos={searchResults?.data}
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
