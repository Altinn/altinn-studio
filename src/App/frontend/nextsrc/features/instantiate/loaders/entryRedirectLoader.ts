import { redirect } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';

import { InstanceApi } from 'nextsrc/core/apiClient/instanceApi';
import { GlobalData } from 'nextsrc/core/globalData';
import { ServerStatusCodes } from 'nextsrc/core/serverStatusCodes';
import { routeBuilders } from 'nextsrc/routesBuilder';
import type { QueryClient } from '@tanstack/react-query';

import type { IInstance } from 'src/types/shared';

function isStateless() {
  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  return entryType !== 'new-instance' && entryType !== 'select-instance';
}

export const entryRedirectLoader = (_: QueryClient) => async (_: LoaderFunctionArgs) => {
  if (isStateless()) {
    return handleStateless();
  }

  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  if (entryType === 'new-instance') {
    const [instanceOwnerPartyId, instanceGuid] = (await createNewInstance()).id.split('/');
    return redirect(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
  }

  if (entryType === 'select-instance') {
    return redirect(routeBuilders.instanceSelection({}));
  }

  throw new Error();
};

async function createNewInstance(): Promise<IInstance> {
  const profile = GlobalData.userProfile;
  if (!profile) {
    throw new Response('User profile not available', { status: ServerStatusCodes.Unauthorized });
  }
  return await InstanceApi.create(profile.partyId);
}

// FIXME: Placeholder
function handleStateless() {
  // TODO: find page to redirect to and handle anonymous
  // fetch pageid
  return redirect(routeBuilders.stateless({ pageId: '' })); // TODO: find out where to go
}
