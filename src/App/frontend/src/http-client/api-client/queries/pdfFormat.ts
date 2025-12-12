import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type PdfFormatParams = {
  instanceId: string;
  dataElementId: string;
};

export type PdfFormatResponse = {
  excludedPages?: string[];
  excludedComponents?: string[];
};

// ============================================================
// Query Key
// ============================================================

export const pdfFormatKeys = {
  all: ['pdfFormat'] as const,
  byInstance: (params: PdfFormatParams) => [...pdfFormatKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchPdfFormat(params: PdfFormatParams): Promise<PdfFormatResponse> {
  const { instanceId, dataElementId } = params;
  const url = `/api/v1/instances/${instanceId}/data/${dataElementId}/pdf/format`;
  const response = await apiClient.get<PdfFormatResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function pdfFormatQueryOptions(params: PdfFormatParams | undefined) {
  return queryOptions({
    queryKey: pdfFormatKeys.byInstance(params!),
    queryFn: params ? () => fetchPdfFormat(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function usePdfFormatQuery(params: PdfFormatParams | undefined) {
  return useQuery(pdfFormatQueryOptions(params));
}

/** Simple data hook */
export function usePdfFormat(params: PdfFormatParams | undefined) {
  const { data } = usePdfFormatQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidatePdfFormat() {
  const queryClient = useQueryClient();

  return (params?: PdfFormatParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: pdfFormatKeys.byInstance(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: pdfFormatKeys.all,
    });
  };
}
