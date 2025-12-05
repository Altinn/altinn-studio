import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type DataListParams = {
  url: string;
};

export type DataListItem = Record<string, unknown>;

export type DataListResponse = {
  listItems: DataListItem[];
  _metaData?: {
    page?: number;
    pageCount?: number;
    pageSize?: number;
    totaltItemsCount?: number;
    links?: Array<{
      rel: string;
      href: string;
    }>;
  };
};

// ============================================================
// Query Key
// ============================================================

export const dataListKeys = {
  all: ['dataList'] as const,
  byUrl: (params: DataListParams) => [...dataListKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchDataList(params: DataListParams): Promise<DataListResponse> {
  const { url } = params;
  const response = await axios.get<DataListResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function dataListQueryOptions(params: DataListParams | undefined) {
  return queryOptions({
    queryKey: dataListKeys.byUrl(params!),
    queryFn: params ? () => fetchDataList(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useDataListQuery(params: DataListParams | undefined) {
  return useQuery(dataListQueryOptions(params));
}

/** Simple data hook */
export function useDataList(params: DataListParams | undefined) {
  const { data } = useDataListQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateDataList() {
  const queryClient = useQueryClient();

  return (params?: DataListParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: dataListKeys.byUrl(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: dataListKeys.all,
    });
  };
}
