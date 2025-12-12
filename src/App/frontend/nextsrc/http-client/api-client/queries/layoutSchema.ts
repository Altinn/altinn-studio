import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type LayoutSchemaResponse = Record<string, unknown> | undefined; // JSON Schema

// ============================================================
// Query Key
// ============================================================

export const layoutSchemaKeys = {
  all: ['layoutSchema'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchLayoutSchema(): Promise<LayoutSchemaResponse> {
  // Get the CDN base URL from the frontend script tag
  const schemaBaseUrl = document
    .querySelector('script[src$="altinn-app-frontend.js"]')
    ?.getAttribute('src')
    ?.replace('altinn-app-frontend.js', 'schemas/json/layout/');

  if (!schemaBaseUrl) {
    return undefined;
  }

  const response = await axios.get<LayoutSchemaResponse>(`${schemaBaseUrl}layout.schema.v1.json`);
  return response.data ?? undefined;
}

// ============================================================
// Query Options
// ============================================================

export function layoutSchemaQueryOptions() {
  return queryOptions({
    queryKey: layoutSchemaKeys.all,
    queryFn: fetchLayoutSchema,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useLayoutSchemaQuery() {
  return useQuery(layoutSchemaQueryOptions());
}

/** Simple data hook */
export function useLayoutSchema() {
  const { data } = useLayoutSchemaQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidateLayoutSchema() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: layoutSchemaKeys.all,
    });
}
