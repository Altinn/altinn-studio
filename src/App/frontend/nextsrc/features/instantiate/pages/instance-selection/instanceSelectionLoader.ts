import { redirect } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';

import { activeInstancesQuery, InstanceApi } from 'nextsrc/core/apiClient/instanceApi';
import { GlobalData } from 'nextsrc/core/globalData';
import { ServerStatusCodes } from 'nextsrc/core/serverStatusCodes';
import { queryClient } from 'nextsrc/QueryClient';
import { routeBuilders } from 'nextsrc/routesBuilder';

export const instanceSelectionLoader = async (_args: LoaderFunctionArgs) => {
  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  if (entryType !== 'select-instance') {
    throw new Response('Instance selection is not enabled for this application', { status: 403 });
  }

  const party = GlobalData.selectedParty;
  if (!party) {
    throw new Response('No selected party', { status: ServerStatusCodes.Unauthorized });
  }

  const activeInstances = await queryClient.ensureQueryData(activeInstancesQuery(party.partyId));

  // activeInstances.sort((a, b) => new Date(a.lastChanged).getTime() - new Date(b.lastChanged).getTime());

  if (activeInstances.length === 0) {
    const newInstance = await InstanceApi.create(party.partyId);
    const [instanceOwnerPartyId, instanceGuid] = newInstance.id.split('/');
    return redirect(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
  }

  return null;
  //  return { activeInstances };
};
