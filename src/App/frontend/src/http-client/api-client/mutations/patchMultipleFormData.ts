import { useMutation } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type JsonPatchOperation = {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
};

export type PatchMultipleFormDataParams = {
  instanceOwnerPartyId: string;
  instanceGuid: string;
  patches: Array<{
    dataElementId: string;
    patch: JsonPatchOperation[];
  }>;
  ignoredValidators?: string[];
};

export type PatchMultipleFormDataResponse = {
  newDataModels: Record<string, unknown>;
  validationIssues: Record<
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
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function doPatchMultipleFormData(
  params: PatchMultipleFormDataParams,
): Promise<PatchMultipleFormDataResponse> {
  const { instanceOwnerPartyId, instanceGuid, patches, ignoredValidators } = params;
  const url = `/instances/${instanceOwnerPartyId}/${instanceGuid}/data`;

  const requestBody = {
    patches,
    ignoredValidators,
  };

  const response = await apiClient.patch<PatchMultipleFormDataResponse>(url, requestBody);
  return response.data;
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function usePatchMultipleFormDataMutation() {
  return useMutation({
    mutationFn: doPatchMultipleFormData,
  });
}

/** Simple mutation hook */
export function usePatchMultipleFormData() {
  const mutation = usePatchMultipleFormDataMutation();

  return async (params: PatchMultipleFormDataParams): Promise<PatchMultipleFormDataResponse> =>
    mutation.mutateAsync(params);
}