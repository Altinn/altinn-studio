import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type UserProfileResponse = {
  userId: number;
  userName: string;
  phoneNumber?: string;
  email?: string;
  partyId: number;
  party?: {
    partyId: number;
    partyTypeName: number;
    orgNumber?: string;
    ssn?: string;
    name: string;
  };
  userType: number;
  profileSettingPreference?: {
    language: string;
    preSelectedPartyId: number;
    doNotPromptForParty: boolean;
  };
};

// ============================================================
// Query Key
// ============================================================

export const userProfileKeys = {
  all: ['userProfile'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchUserProfile(): Promise<UserProfileResponse> {
  const url = '/api/v1/profile/user';
  const response = await apiClient.get<UserProfileResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function userProfileQueryOptions() {
  return queryOptions({
    queryKey: userProfileKeys.all,
    queryFn: fetchUserProfile,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useUserProfileQuery() {
  return useQuery(userProfileQueryOptions());
}

/** Simple data hook */
export function useUserProfile() {
  const { data } = useUserProfileQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidateUserProfile() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: userProfileKeys.all,
    });
}
