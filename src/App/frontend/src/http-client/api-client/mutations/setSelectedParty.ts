import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { selectedPartyKeys } from 'src/http-client/api-client/queries/selectedParty';

// ============================================================
// Types
// ============================================================

export type SetSelectedPartyParams = {
  partyId: number | string;
};

export type SetSelectedPartyResponse = string | null;

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function doSetSelectedParty(params: SetSelectedPartyParams): Promise<SetSelectedPartyResponse> {
  const { partyId } = params;
  const url = `/api/v1/parties/${partyId}`;
  const response = await axios.put<SetSelectedPartyResponse>(url);
  return response.data;
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function useSetSelectedPartyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: doSetSelectedParty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: selectedPartyKeys.all });
    },
  });
}

/** Simple mutation hook */
export function useSetSelectedParty() {
  const mutation = useSetSelectedPartyMutation();

  return async (params: SetSelectedPartyParams): Promise<SetSelectedPartyResponse> => mutation.mutateAsync(params);
}
