import type { AriaAttributes } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/queries/QueryProvider';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getDataListsUrl } from 'src/utils/urls/appUrlHelper';

type SortDirection = 'asc' | 'desc' | 'notSortable' | 'notActive';

export type Filter = {
  pageSize: number;
  pageNumber: number;
  sortColumn?: string;
  sortDirection: AriaAttributes['aria-sort'];
};

export const useDataListQuery = (
  filter: Filter,
  dataListId: string,
  secure?: boolean,
  queryParameters?: Record<string, string>,
) => {
  const { fetchDataList } = useAppQueries();
  const selectedLanguage = useCurrentLanguage();
  const instanceId = useLaxInstanceId();
  const { pageSize, pageNumber, sortColumn, sortDirection } = filter || {};

  const url = getDataListsUrl({
    dataListId,
    queryParameters,
    language: selectedLanguage,
    secure,
    instanceId,
    pageSize: `${pageSize}`,
    pageNumber: `${pageNumber}`,
    sortColumn,
    sortDirection: ariaSortToSortDirection(sortDirection),
  });

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ['fetchDataList', url],
    queryFn: () => fetchDataList(url),
  });
  return { data, error, isLoading, isFetching };
};

function ariaSortToSortDirection(ariaSort: AriaAttributes['aria-sort']): SortDirection {
  switch (ariaSort) {
    case 'ascending':
      return 'asc';
    case 'descending':
      return 'desc';
    default:
      return 'notActive';
  }
}
