import { useQuery } from '@tanstack/react-query';
import type { SortDirection } from '@digdir/design-system-react';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { DataListsActions } from 'src/features/dataLists/dataListsSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { mapFormData } from 'src/utils/databindings';
import { getDataListsUrl } from 'src/utils/urls/appUrlHelper';
import type { IDataList } from 'src/features/dataLists';
import type { IMapping } from 'src/layout/common.generated';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export type Filter = {
  pageSize: number;
  pageNumber: number;
  sortColumn: string | null;
  sortDirection: SortDirection;
};
export const useDataListQuery = (
  filter: Filter,
  dataListId: string,
  secure?: boolean,
  mapping?: IMapping,
): UseQueryResult<IDataList> => {
  const { fetchDataList } = useAppQueries();
  const dispatch = useAppDispatch();
  const { selectedLanguage } = useLanguage();
  const formData = useAppSelector((state) => state.formData.formData);
  const { pageSize, pageNumber, sortColumn, sortDirection } = filter || {};
  const mappedData = useMemoDeepEqual(() => {
    if (mapping) {
      return mapFormData(formData, mapping);
    }

    return {};
  }, [formData, mapping]);

  const url = getDataListsUrl({
    dataListId,
    mappedData,
    language: selectedLanguage,
    secure,
    instanceId: window.instanceId,
    pageSize: `${pageSize}`,
    pageNumber: `${pageNumber}`,
    sortColumn,
    sortDirection,
  });

  return useQuery({
    queryKey: [url],
    queryFn: () => fetchDataList(url),
    onError: (error: HttpClientError) => {
      dispatch(DataListsActions.fetchRejected({ error }));
    },
  });
};
