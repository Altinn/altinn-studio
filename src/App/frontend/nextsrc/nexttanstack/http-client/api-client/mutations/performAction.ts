import { useMutation } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type PerformActionParams = {
  partyId: string;
  instanceGuid: string;
  language: string;
  action?: string;
  buttonId?: string;
  metadata?: Record<string, string>;
  ignoredValidators?: string[];
  onBehalfOf?: string;
};

export type PerformActionResponse = {
  clientActions?: Array<{
    id: string;
    type: string;
    metadata?: Record<string, string>;
  }>;
  updatedDataModels?: Record<string, unknown>;
  updatedValidationIssues?: Record<
    string,
    Array<{
      code: string;
      description: string;
      field: string;
      severity: 'error' | 'warning' | 'informational' | 'success' | 'fixed';
      source: string;
      customTextKey?: string;
      customTextParams?: string[];
    }>
  >;
  instance?: Record<string, unknown>;
  redirectUrl?: string;
  error?: {
    code: string;
    message: string;
  };
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function doPerformAction(params: PerformActionParams): Promise<PerformActionResponse> {
  const { partyId, instanceGuid, language, action, buttonId, metadata, ignoredValidators, onBehalfOf } = params;
  const url = `/api/v1/instances/${partyId}/${instanceGuid}/actions?language=${language}`;

  const requestBody = {
    action,
    buttonId,
    metadata,
    ignoredValidators,
    onBehalfOf,
  };

  const response = await apiClient.post<PerformActionResponse>(url, requestBody);

  if (response.status < 200 || response.status >= 300) {
    throw new Error('Failed to perform action');
  }

  return response.data;
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function usePerformActionMutation() {
  return useMutation({
    mutationFn: doPerformAction,
  });
}

/** Simple mutation hook */
export function usePerformAction() {
  const mutation = usePerformActionMutation();

  return async (params: PerformActionParams): Promise<PerformActionResponse> => mutation.mutateAsync(params);
}
