import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type SelectedPartyResponse =
  | {
      partyId: number;
      partyTypeName: number;
      orgNumber?: string;
      ssn?: string;
      unitType?: string;
      name: string;
      isDeleted: boolean;
      onlyHierarchyElementWithNoAccess: boolean;
      person?: {
        ssn: string;
        name: string;
        firstName: string;
        middleName?: string;
        lastName: string;
        telephoneNumber?: string;
        mobileNumber?: string;
        mailingAddress?: string;
        mailingPostalCode?: string;
        mailingPostalCity?: string;
        addressMunicipalNumber?: string;
        addressMunicipalName?: string;
        addressStreetName?: string;
        addressHouseNumber?: string;
        addressHouseLetter?: string;
        addressPostalCode?: string;
        addressCity?: string;
      };
      organization?: {
        orgNumber: string;
        name: string;
        unitType: string;
        telephoneNumber?: string;
        mobileNumber?: string;
        faxNumber?: string;
        eMailAddress?: string;
        internetAddress?: string;
        mailingAddress?: string;
        mailingPostalCode?: string;
        mailingPostalCity?: string;
        businessAddress?: string;
        businessPostalCode?: string;
        businessPostalCity?: string;
      };
      childParties?: SelectedPartyResponse[];
    }
  | undefined;

// ============================================================
// Query Key
// ============================================================

export const selectedPartyKeys = {
  all: ['selectedParty'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchSelectedParty(): Promise<SelectedPartyResponse> {
  const url = '/api/v1/parties/current';
  const response = await apiClient.get<SelectedPartyResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function selectedPartyQueryOptions() {
  return queryOptions({
    queryKey: selectedPartyKeys.all,
    queryFn: fetchSelectedParty,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useSelectedPartyQuery() {
  return useQuery(selectedPartyQueryOptions());
}

/** Simple data hook */
export function useSelectedParty() {
  const { data } = useSelectedPartyQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidateSelectedParty() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: selectedPartyKeys.all,
    });
}
