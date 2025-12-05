import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type PatchMultipleFormDataParams = {
  url: string;
  data: {
    patches: Array<{
      dataElementId: string;
      patch: Array<{
        op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
        path: string;
        value?: unknown;
        from?: string;
      }>;
    }>;
    ignoredValidators?: string[];
  };
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
  const { url, data } = params;
  const response = await axios.patch<PatchMultipleFormDataResponse>(url, data);
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
