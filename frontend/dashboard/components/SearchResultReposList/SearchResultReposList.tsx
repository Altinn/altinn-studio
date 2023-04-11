import React from 'react';
import { useAugmentReposWithStarred } from '../../hooks/useAugmentReposWithStarred';
import { RepoList } from '../../components/RepoList';
import { useTranslation } from 'react-i18next';
import { useReposSearch } from 'dashboard/hooks/useReposSearch';
import { IRepository } from 'app-shared/types/global';

const rowsPerPageOptions = [8];

type SearchResultReposList = {
  starredRepos: IRepository[];
  searchValue: string;
};
export const SearchResultReposList = ({ starredRepos, searchValue }: SearchResultReposList) => {
  const { t } = useTranslation();
  const { searchResults, isLoadingSearchResults, sortModel, setPageNumber, setSortModel } =
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
        isServerSort={true}
        rowCount={searchResults?.totalCount}
        onPageChange={setPageNumber}
        onSortModelChange={setSortModel}
        sortModel={sortModel}
        pageSize={rowsPerPageOptions[0]}
        rowsPerPageOptions={rowsPerPageOptions}
      />
    </div>
  );
};
