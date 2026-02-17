import { redirect } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';

import { activeInstancesQuery, InstanceApi } from 'nextsrc/core/apiClient/instanceApi';
import { GlobalData } from 'nextsrc/core/globalData';
import { ServerStatusCodes } from 'nextsrc/core/serverStatusCodes';
import { queryClient } from 'nextsrc/QueryClient';
import { routeBuilders } from 'nextsrc/routesBuilder';

import type { IInstance } from 'src/types/shared';

function isStateless() {
  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  return entryType !== 'new-instance' && entryType !== 'select-instance';
}

export const entryRedirectLoader = () => async (_: LoaderFunctionArgs) => {
  if (isStateless()) {
    return handleStateless();
  }

  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  if (entryType === 'new-instance') {
    const instance = await createNewInstance();
    const [instanceOwnerPartyId, instanceGuid] = instance.id.split('/');
    return redirect(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
  }

  if (entryType === 'select-instance' && GlobalData.selectedParty) {
    const activeInstances = await queryClient.ensureQueryData(activeInstancesQuery(GlobalData.selectedParty.partyId));

    if (activeInstances.length === 0) {
      const instance = await createNewInstance();
      const [instanceOwnerPartyId, instanceGuid] = instance.id.split('/');
      return redirect(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
    }
    if (activeInstances.length === 1) {
      const [instanceOwnerPartyId, instanceGuid] = activeInstances[0].id.split('/');
      return redirect(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
    }

    return redirect(routeBuilders.instanceSelection({}));
  }

  throw new Error();
};

async function createNewInstance(): Promise<IInstance> {
  const party = GlobalData.selectedParty;
  if (!party) {
    throw new Response('User profile not available', { status: ServerStatusCodes.Unauthorized });
  }
  return await InstanceApi.create(party.partyId);
}

// FIXME: Placeholder
function handleStateless() {
  // TODO: find page to redirect to and handle anonymous
  // fetch pageid
  return redirect(routeBuilders.stateless({ pageId: '' })); // TODO: find out where to go
}
