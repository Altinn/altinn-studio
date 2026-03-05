import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { InstanceApi } from 'nextsrc/core/api-client/instance.api';
import { GlobalData } from 'nextsrc/core/globalData';
import { prefetchActiveInstances } from 'nextsrc/core/queries/instance';
import { ServerStatusCodes } from 'nextsrc/core/serverStatusCodes';
import { routeBuilders } from 'nextsrc/routesBuilder';
import type { QueryClient } from 'nextsrc/core/queries/types';

export const instanceSelectionLoader = (queryClient: QueryClient) => async (_args: LoaderFunctionArgs) => {
  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  if (entryType !== 'select-instance') {
    throw new Response('Instance selection is not enabled for this application', { status: 403 });
  }

  const selectedParty = GlobalData.selectedParty;
  if (!selectedParty) {
    throw new Response('No selected party', { status: ServerStatusCodes.Unauthorized });
  }

  const activeInstances = await prefetchActiveInstances(queryClient, selectedParty.partyId.toString());
  if (activeInstances.length === 0) {
    const newInstance = await InstanceApi.create(selectedParty.partyId);
    const [instanceOwnerPartyId, instanceGuid] = newInstance.id.split('/');
    return redirect(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
  }

  return null;
};
