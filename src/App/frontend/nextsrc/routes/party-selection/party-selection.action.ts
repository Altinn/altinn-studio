import type { ActionFunctionArgs } from 'react-router-dom';

import { PartiesApi } from 'nextsrc/core/apiClient/partiesApi';
import { instantiationQueries } from 'nextsrc/features/Instantiation';
import { queryClient } from 'nextsrc/QueryClient';
import type { QueryClient } from '@tanstack/react-query';

export const partySelectionAction =
  (_: QueryClient) =>
  async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const selectedPartyId = formData.get('partyId')?.toString();
    if (!selectedPartyId) {
      return { ok: false, message: 'No selected party id.' };
    }
    console.log('selectedPartyId: ', selectedPartyId);

    await PartiesApi.updateSelectedParty(selectedPartyId);
    queryClient.invalidateQueries({ queryKey: instantiationQueries.allParties() });

    // TODO: update selected party on frontend too. But on window?

    return null;
  };
