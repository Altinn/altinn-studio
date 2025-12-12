import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type TextResourcesParams = {
  language: string;
};

export type TextResourcesResponse = {
  language: string;
  resources: Array<{
    id: string;
    value: string;
    variables?: Array<{
      key: string;
      dataSource: string;
    }>;
  }>;
};

// ============================================================
// Query Key
// ============================================================

export const textResourcesKeys = {
  all: ['textResources'] as const,
  byLanguage: (params: TextResourcesParams) => [...textResourcesKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchTextResources(params: TextResourcesParams): Promise<TextResourcesResponse> {
  const { language } = params;
  const url = `/api/v1/texts/${language}`;
  const response = await apiClient.get<TextResourcesResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function textResourcesQueryOptions(params: TextResourcesParams | undefined) {
  return queryOptions({
    queryKey: textResourcesKeys.byLanguage(params!),
    queryFn: params ? () => fetchTextResources(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useTextResourcesQuery(params: TextResourcesParams | undefined) {
  return useQuery(textResourcesQueryOptions(params));
}

/** Simple data hook */
export function useTextResources(params: TextResourcesParams | undefined) {
  const { data } = useTextResourcesQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateTextResources() {
  const queryClient = useQueryClient();

  return (params?: TextResourcesParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: textResourcesKeys.byLanguage(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: textResourcesKeys.all,
    });
  };
}
