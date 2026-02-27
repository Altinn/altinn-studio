import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { isAxiosError } from 'axios';
import { InstanceApi } from 'nextsrc/core/api-client/instance.api';
import { GlobalData } from 'nextsrc/core/globalData';
import { activeInstancesQuery } from 'nextsrc/core/queries/instance';
import { ServerStatusCodes } from 'nextsrc/core/serverStatusCodes';
import { routeBuilders } from 'nextsrc/routesBuilder';
import type { QueryClient } from '@tanstack/react-query';
import type { InstanceResponse } from 'nextsrc/api/generated/model';

function isStateless() {
  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  return entryType !== 'new-instance' && entryType !== 'select-instance';
}

export const loader = (queryClient: QueryClient) => async (_: LoaderFunctionArgs) => {
  if (isStateless()) {
    return handleStateless();
  }

  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  if (entryType === 'new-instance') {
    const instance = await createNewInstanceOrRedirect();
    if (instance instanceof Response) {
      return instance;
    }
    const [instanceOwnerPartyId, instanceGuid] = instance.id.split('/');
    return redirect(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
  }

  if (entryType === 'select-instance' && GlobalData.selectedParty) {
    const activeInstances = await queryClient.ensureQueryData(activeInstancesQuery(GlobalData.selectedParty.partyId));

    if (activeInstances.length === 0) {
      const instance = await createNewInstanceOrRedirect();
      if (instance instanceof Response) {
        return instance;
      }
      const [instanceOwnerPartyId, instanceGuid] = instance.id.split('/');
      return redirect(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
    }
    if (activeInstances.length === 1) {
      const id = activeInstances.at(0)?.id;
      const [instanceOwnerPartyId, instanceGuid] = id?.split('/') ?? []; // TODO: fix type so that id is not nullable (which it is not)
      return redirect(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
    }

    return redirect(routeBuilders.instanceSelection({}));
  }

  throw new Error();
};

async function createNewInstanceOrRedirect(): Promise<InstanceResponse | Response> {
  try {
    return await createNewInstance();
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      return redirect(routeBuilders.partySelection({ errorCode: '403' }));
    }
    throw error;
  }
}

async function createNewInstance(): Promise<InstanceResponse> {
  const party = GlobalData.selectedParty;

  const currentPartyIdFromCookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('AltinnPartyId='))
    ?.split('=')[1];

  const currentPartyId = currentPartyIdFromCookie ?? party?.partyId;
  if (!currentPartyId) {
    throw new Response('User profile not available', { status: ServerStatusCodes.Unauthorized });
  }
  const partyId = typeof currentPartyId === 'string' ? Number.parseInt(currentPartyId) : currentPartyId;
  return await InstanceApi.create(partyId);
}

// FIXME: Placeholder
function handleStateless() {
  // TODO: find page to redirect to and handle anonymous
  // fetch pageid
  return redirect(routeBuilders.stateless({ pageId: '' })); // TODO: find out where to go
}
