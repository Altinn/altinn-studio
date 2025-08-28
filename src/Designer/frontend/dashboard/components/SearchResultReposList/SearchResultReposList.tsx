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
  const { data: starredRepos = [], isPending: hasPendingStarredRepos } = useStarredReposQuery();
  const { t } = useTranslation();
  const {
    searchResults,
    isLoadingSearchResults: hasPendingRepos,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    onSortClick,
  } = useReposSearch({ keyword: searchValue });

  const reposIncludingStarredData = useAugmentReposWithStarred({
    repos: searchResults?.data,
    starredRepos,
  });

  return (
    <div>
      <h2>{t('dashboard.search_result')}</h2>
      <RepoList
        repos={reposIncludingStarredData}
        isLoading={hasPendingRepos || hasPendingStarredRepos}
        onPageSizeChange={setPageSize}
        isServerSort={true}
        totalRows={searchResults?.totalCount}
        pageNumber={pageNumber}
        onPageChange={setPageNumber}
        pageSize={pageSize}
        onSortClick={onSortClick}
      />
    </div>
  );
};
