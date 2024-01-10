import React from 'react';
import { useAugmentReposWithStarred } from '../../hooks/useAugmentReposWithStarred';
import { RepoList } from '../RepoList';
import { useTranslation } from 'react-i18next';
import { useReposSearch } from 'dashboard/hooks/useReposSearch';
import { IRepository } from 'app-shared/types/global';
import { DATAGRID_PAGE_SIZE_OPTIONS } from 'dashboard/constants';

type SearchResultReposList = {
  starredRepos: IRepository[];
  searchValue: string;
};
export const SearchResultReposList = ({ starredRepos, searchValue }: SearchResultReposList) => {
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

  const reposWithStarred = useAugmentReposWithStarred({
    repos: searchResults?.data,
    starredRepos,
  });

  return (
    <div>
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
        pageSizeOptions={DATAGRID_PAGE_SIZE_OPTIONS}
      />
    </div>
  );
};
