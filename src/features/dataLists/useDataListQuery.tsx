import { useQuery } from '@tanstack/react-query';
import type { SortDirection } from '@digdir/design-system-react/dist/types/components/legacy/LegacyTable/utils';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getDataListsUrl } from 'src/utils/urls/appUrlHelper';
import type { IDataList } from 'src/features/dataLists/index';
import type { IMapping } from 'src/layout/common.generated';

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
  queryParameters?: Record<string, string>,
): UseQueryResult<IDataList> => {
  const { fetchDataList } = useAppQueries();
  const selectedLanguage = useCurrentLanguage();
  const instanceId = useLaxInstanceId();
  const mappingResult = FD.useMapping(mapping);
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
    sortDirection,
  });

  return useQuery({
    queryKey: ['fetchDataList', url],
    queryFn: () => fetchDataList(url),
  });
};
