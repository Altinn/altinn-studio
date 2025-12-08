import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type ApplicationMetadataResponse = {
  id: string;
  org: string;
  title: Record<string, string>;
  dataTypes: Array<{
    id: string;
    allowedContentTypes: string[];
    appLogic?: { classRef: string };
    taskId?: string;
    maxCount?: number;
    minCount?: number;
    maxSize?: number;
  }>;
  partyTypesAllowed: {
    bankruptcyEstate: boolean;
    organisation: boolean;
    person: boolean;
    subUnit: boolean;
  };
  onEntry?: { show: string };
  autoDeleteOnProcessEnd?: boolean;
  created?: string;
  createdBy?: string;
  lastChanged?: string;
  lastChangedBy?: string;
};

// ============================================================
// Query Key
// ============================================================

export const applicationMetadataKeys = {
  all: ['applicationMetadata'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchApplicationMetadata(): Promise<ApplicationMetadataResponse> {
  const url = '/api/v1/applicationmetadata';
  const response = await apiClient.get<ApplicationMetadataResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function applicationMetadataQueryOptions() {
  return queryOptions({
    queryKey: applicationMetadataKeys.all,
    queryFn: fetchApplicationMetadata,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useApplicationMetadataQuery() {
  return useQuery(applicationMetadataQueryOptions());
}

/** Simple data hook */
export function useApplicationMetadata() {
  const { data } = useApplicationMetadataQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidateApplicationMetadata() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: applicationMetadataKeys.all,
    });
}
