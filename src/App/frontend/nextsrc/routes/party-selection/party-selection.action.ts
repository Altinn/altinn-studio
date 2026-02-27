import { redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { PartiesApi } from 'nextsrc/core/api-client/parties.api';
import { invalidatePartyQueries } from 'nextsrc/core/queries/parties';
import { routeBuilders } from 'nextsrc/routesBuilder';
import type { QueryClient } from '@tanstack/react-query';

export const partySelectionAction =
  (queryClient: QueryClient) =>
  async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const selectedPartyId = formData.get('partyId')?.toString();
    if (!selectedPartyId) {
      return { ok: false, message: 'No selected party id.' };
    }

    await PartiesApi.updateSelectedParty(selectedPartyId);
    invalidatePartyQueries(queryClient);

    return redirect(routeBuilders.root({}));
  };
