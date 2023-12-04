import { useState } from 'react';
import { GridSortModel } from '@mui/x-data-grid';
import { useSearchReposQuery } from '../queries';
import { SearchRepositoryResponse } from 'app-shared/types/api/SearchRepositoryResponse';
import { useSearchParamsState } from '../useSearchParamsState';
import {
  DATAGRID_PAGE_SIZE_TYPE,
  DATAGRID_ROWS_PER_PAGE_OPTIONS,
  DATAGRID_DEFAULT_PAGE_SIZE,
} from '../../constants';

type UseRepoSearchResult = {
  searchResults: SearchRepositoryResponse | undefined;
  isLoadingSearchResults: boolean;
  pageSize: number;
  sortModel: GridSortModel;
  setSortModel: (selectedSortModel: GridSortModel) => void;
  setPageNumber: (pageNumber: number) => void;
  setPageSize: (pageSize: DATAGRID_PAGE_SIZE_TYPE) => void;
};

type UseReposSearchProps = {
  keyword?: string;
  uid?: number;
  defaultPageSize?: DATAGRID_PAGE_SIZE_TYPE;
};
export const useReposSearch = ({
  keyword,
  uid,
  defaultPageSize = DATAGRID_DEFAULT_PAGE_SIZE,
}: UseReposSearchProps): UseRepoSearchResult => {
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useSearchParamsState<DATAGRID_PAGE_SIZE_TYPE>(
    'pageSize',
    defaultPageSize,
    (value: string) => {
      const parsedValue = Number(value);
      return DATAGRID_ROWS_PER_PAGE_OPTIONS.includes(parsedValue)
        ? (parsedValue as DATAGRID_PAGE_SIZE_TYPE)
        : defaultPageSize;
    },
  );
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'alpha', sort: 'asc' }]);

  const { data: searchResults, isPending: isLoadingSearchResults } = useSearchReposQuery({
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
