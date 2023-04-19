import { useState } from 'react';
import { GridSortModel } from '@mui/x-data-grid';
import { useSearchReposQuery } from 'dashboard/hooks/useRepoQueries';
import { SearchRepository } from '../../services/repoService';
import { useSearchParamsState } from '../useSearchParamsState';

type UseRepoSearchResult = {
  searchResults: SearchRepository | undefined;
  isLoadingSearchResults: boolean;
  pageSize: number;
  sortModel: GridSortModel;
  setSortModel: (selectedSortModel: GridSortModel) => void;
  setPageNumber: (pageNumber: number) => void;
  setPageSize: (pageSize: number) => void;
};

type UseReposSearchProps = {
  keyword?: string;
  uid?: number;
  defaultPageSize?: number;
};
export const useReposSearch = ({
  keyword,
  uid,
  defaultPageSize,
}: UseReposSearchProps): UseRepoSearchResult => {
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useSearchParamsState<number>('pageSize', defaultPageSize || 5, Number);
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'alpha', sort: 'asc' }]);

  const { data: searchResults, isLoading: isLoadingSearchResults } = useSearchReposQuery({
    ...buildQuery({ keyword, uid, limit: pageSize }),
    page: pageNumber,
    sortby: sortModel?.[0]?.field,
    order: sortModel?.[0]?.sort as string,
  });

  return {
    searchResults,
    isLoadingSearchResults,
    sortModel,
    pageSize,
    setPageNumber,
    setSortModel,
    setPageSize,
  };
};

type BuildQueryProps = { limit?: number } & Omit<UseReposSearchProps, 'defaultPageSize'>;
const buildQuery = (params: BuildQueryProps): UseReposSearchProps => {
  let query: BuildQueryProps;

  if (params['uid']) {
    query = { ...query, uid: params.uid };
  }

  if (params['keyword']) {
    query = { ...query, keyword: params.keyword };
  }

  if (params['limit']) {
    query = { ...query, limit: params.limit };
  }

  return query;
};
