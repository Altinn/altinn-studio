import { useState } from 'react';
import { useSearchReposQuery } from '../queries';
import type { SearchRepositoryResponse } from 'app-shared/types/api/SearchRepositoryResponse';
import { useSearchParamsState } from 'app-shared/hooks/useSearchParamsState';
import type { DATAGRID_PAGE_SIZE_TYPE } from '../../constants';
import { DATAGRID_PAGE_SIZE_OPTIONS, DATAGRID_DEFAULT_PAGE_SIZE } from '../../constants';
import { typedLocalStorage } from '@studio/pure-functions';

export enum Direction {
  Asc = 'asc',
  Desc = 'desc',
}

type SortPreference = {
  sortKey: string;
  direction: Direction;
};

type UseRepoSearchResult = {
  searchResults: SearchRepositoryResponse | undefined;
  isLoadingSearchResults: boolean;
  pageSize: DATAGRID_PAGE_SIZE_TYPE;
  pageNumber: number;
  setPageNumber: (pageNumber: number) => void;
  setPageSize: (pageSize: DATAGRID_PAGE_SIZE_TYPE) => void;
  onSortClick: (columnKey: string) => void;
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
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useSearchParamsState<DATAGRID_PAGE_SIZE_TYPE>(
    'pageSize',
    defaultPageSize,
    (value: string) => {
      const parsedValue = Number(value);
      return DATAGRID_PAGE_SIZE_OPTIONS.includes(parsedValue)
        ? (parsedValue as DATAGRID_PAGE_SIZE_TYPE)
        : defaultPageSize;
    },
  );

  const savedPreference = typedLocalStorage.getItem<SortPreference>('dashboard-app-sort-order');
  const [selectedColumn, setSelectedColumn] = useState(savedPreference?.sortKey || 'name');
  const [sortDirection, setSortDirection] = useState(savedPreference?.direction || Direction.Asc);

  const toggleSortDirection = () => {
    setSortDirection((prevDirection) => {
      const newDirection = prevDirection === Direction.Asc ? Direction.Desc : Direction.Asc;
      typedLocalStorage.setItem('dashboard-app-sort-order', {
        sortKey: selectedColumn,
        direction: newDirection,
      });
      return newDirection;
    });
  };

  const onSortClick = (columnKey: string) => {
    if (selectedColumn === columnKey) {
      toggleSortDirection();
    } else {
      setSelectedColumn(columnKey);
      const newDirection = Direction.Asc;
      setSortDirection(newDirection);
      typedLocalStorage.setItem('dashboard-app-sort-order', {
        sortKey: columnKey,
        direction: newDirection,
      });
    }
  };

  const filter = {
    uid,
    keyword,
    limit: pageSize,
    page: pageNumber,
    sortby: selectedColumn,
    order: sortDirection,
  };

  const cleanFilter = Object.entries(filter)
    .filter(([_, value]) => value !== null && value !== undefined)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const { data: searchResults, isPending: isLoadingSearchResults } =
    useSearchReposQuery(cleanFilter);

  const getNextExistingPageNumber = () => {
    const numberOfPages = Math.ceil(searchResults?.totalCount / pageSize);
    const nextPageNumber = pageNumber + 1;
    return nextPageNumber <= numberOfPages ? nextPageNumber : pageNumber;
  };

  useSearchReposQuery({ ...cleanFilter, page: getNextExistingPageNumber() });

  return {
    searchResults,
    isLoadingSearchResults,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    onSortClick,
  };
};
