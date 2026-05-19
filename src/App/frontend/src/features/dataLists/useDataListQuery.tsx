import type { AriaAttributes } from 'react';

import type { UseQueryResult } from '@tanstack/react-query';

import { useDataListQuery as useCoreDataListQuery } from 'src/core/queries/options';
import { FormStore } from 'src/features/form/FormContext';
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
  const selectedLanguage = useCurrentLanguage();
  const instanceId = useLaxInstanceId();
  const mappingResult = FormStore.data.useMapping(mapping, FormStore.bootstrap.useDefaultDataType());
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

  return useCoreDataListQuery(url);
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
