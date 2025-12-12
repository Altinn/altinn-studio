import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type LogoResponse = string; // SVG content

// ============================================================
// Query Key
// ============================================================

export const logoKeys = {
  all: ['logo'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchLogo(): Promise<LogoResponse> {
  const url = 'https://altinncdn.no/img/Altinn-logo-blue.svg';
  const response = await axios.get<LogoResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function logoQueryOptions() {
  return queryOptions({
    queryKey: logoKeys.all,
    queryFn: fetchLogo,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useLogoQuery() {
  return useQuery(logoQueryOptions());
}

/** Simple data hook */
export function useLogo() {
  const { data } = useLogoQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidateLogo() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: logoKeys.all,
    });
}
