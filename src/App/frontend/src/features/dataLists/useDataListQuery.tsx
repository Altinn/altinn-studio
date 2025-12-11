import type { AriaAttributes } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getDataListsUrl } from 'src/utils/urls/appUrlHelper';
import type { IDataList } from 'src/features/dataLists/index';
import type { IMapping } from 'src/layout/common.generated';

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
  mapping?: IMapping,
  queryParameters?: Record<string, string>,
): UseQueryResult<IDataList> => {
  const { fetchDataList } = useAppQueries();
  const selectedLanguage = useCurrentLanguage();
  const instanceId = useLaxInstanceId();
  const mappingResult = FD.useMapping(mapping, DataModels.useDefaultDataType());
  const { pageSize, pageNumber, sortColumn, sortDirection } = filter || {};

  const url = getDataListsUrl({
    dataListId,
    queryParameters: {
      ...mappingResult,
      ...queryParameters,
    },
    language: selectedLanguage,
    secure,
    instanceId,
    pageSize: `${pageSize}`,
    pageNumber: `${pageNumber}`,
    sortColumn,
    sortDirection: ariaSortToSortDirection(sortDirection),
  });

  return useQuery({
    queryKey: ['fetchDataList', url],
    queryFn: () => fetchDataList(url),
  });
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
