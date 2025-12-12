import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type RuleHandlerParams = {
  layoutSetId: string;
};

export type RuleHandlerResponse = string | null;

// ============================================================
// Query Key
// ============================================================

export const ruleHandlerKeys = {
  all: ['ruleHandler'] as const,
  byLayoutSet: (params: RuleHandlerParams) => [...ruleHandlerKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchRuleHandler(params: RuleHandlerParams): Promise<RuleHandlerResponse> {
  const { layoutSetId } = params;
  const url = `/api/v1/layoutsets/${layoutSetId}/rule-handler`;
  try {
    const response = await apiClient.get<string>(url);
    return response.data;
  } catch {
    return null;
  }
}

// ============================================================
// Query Options
// ============================================================

export function ruleHandlerQueryOptions(params: RuleHandlerParams | undefined) {
  return queryOptions({
    queryKey: ruleHandlerKeys.byLayoutSet(params!),
    queryFn: params ? () => fetchRuleHandler(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useRuleHandlerQuery(params: RuleHandlerParams | undefined) {
  return useQuery(ruleHandlerQueryOptions(params));
}

/** Simple data hook */
export function useRuleHandler(params: RuleHandlerParams | undefined) {
  const { data } = useRuleHandlerQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateRuleHandler() {
  const queryClient = useQueryClient();

  return (params?: RuleHandlerParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: ruleHandlerKeys.byLayoutSet(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: ruleHandlerKeys.all,
    });
  };
}
