import { useState } from 'react';
import type { GridSortModel } from '@mui/x-data-grid';
import { useSearchReposQuery } from '../queries';
import type { SearchRepositoryResponse } from 'app-shared/types/api/SearchRepositoryResponse';
import { useSearchParamsState } from 'app-shared/hooks/useSearchParamsState';
import type { DATAGRID_PAGE_SIZE_TYPE } from '../../constants';
import { DATAGRID_PAGE_SIZE_OPTIONS, DATAGRID_DEFAULT_PAGE_SIZE } from '../../constants';
// import { useTableSorting } from '../../../libs/studio-components/src/hooks/useTableSorting';

type UseRepoSearchResult = {
  searchResults: SearchRepositoryResponse | undefined;
  isLoadingSearchResults: boolean;
  pageSize: DATAGRID_PAGE_SIZE_TYPE;
  pageNumber: number;
  sortModel: GridSortModel;
  setSortModel: (selectedSortModel: GridSortModel) => void;
  setPageNumber: (pageNumber: number) => void;
  setPageSize: (pageSize: DATAGRID_PAGE_SIZE_TYPE) => void;
  handleSorting: (columnKey: string) => void;
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
      return DATAGRID_PAGE_SIZE_OPTIONS.includes(parsedValue)
        ? (parsedValue as DATAGRID_PAGE_SIZE_TYPE)
        : defaultPageSize;
    },
  );
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'alpha', sort: 'asc' }]);

  const [sortColumn, setSortColumn] = useState('alpha');
  const [sortDirection, setSortDirection] = useState('asc');

  const toggleSortDirection = () => {
    setSortDirection((prevDirection) => (prevDirection === 'asc' ? 'desc' : 'asc'));
  };

  const handleSorting = (columnKey: string) => {
    if (sortColumn === columnKey) {
      toggleSortDirection();
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const filter = {
    uid,
    keyword,
    limit: pageSize,
    page: pageNumber,
    sortby: sortColumn,
    order: sortDirection,
  };

  const cleanFilter = Object.entries(filter)
    .filter(([_, value]) => value !== null && value !== undefined)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const { data: searchResults, isPending: isLoadingSearchResults } =
    useSearchReposQuery(cleanFilter);

  return {
    searchResults,
    isLoadingSearchResults,
    sortModel,
    pageSize,
    pageNumber,
    setPageNumber,
    setSortModel,
    setPageSize,
    handleSorting,
  };
};
