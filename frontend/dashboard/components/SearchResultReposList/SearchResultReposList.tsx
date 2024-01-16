import React from 'react';
import { useAugmentReposWithStarred } from '../../hooks/useAugmentReposWithStarred';
import { RepoList } from '../RepoList';
import { useTranslation } from 'react-i18next';
import { useReposSearch } from 'dashboard/hooks/useReposSearch';
import { useStarredReposQuery } from 'dashboard/hooks/queries';

type SearchResultReposList = {
  searchValue: string;
};
export const SearchResultReposList = ({ searchValue }: SearchResultReposList) => {
  const { data: starredRepos = [], isPending: areStarredReposPending } = useStarredReposQuery();
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
        isLoading={isLoadingSearchResults || areStarredReposPending}
        onPageSizeChange={setPageSize}
        isServerSort={true}
        rowCount={searchResults?.totalCount}
        onPageChange={setPageNumber}
        onSortModelChange={setSortModel}
        sortModel={sortModel}
        pageSize={pageSize}
      />
    </div>
  );
};
