import { redirect } from 'react-router-dom';

import { GlobalData } from 'nextsrc/core/globalData';
import { ServerStatusCodes } from 'nextsrc/core/serverStatusCodes';
import { InstanceApi } from 'nextsrc/features/instantiate/api';
import { instantiateRouteBuilders } from 'nextsrc/features/instantiate/routes';
import { IInstance } from 'src/types/shared';

function isStateless() {
  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  return entryType !== 'new-instance' && entryType !== 'select-instance';
}

export async function entryRedirectLoader(): Promise<Response> {
  const entryType = GlobalData.applicationMetadata.onEntry?.show;

  if (isStateless()) {
    return handleStateless();
  }

  if (entryType === 'new-instance') {
    const [instanceOwnerPartyId, instanceGuid] = (await createNewInstance()).id.split('/');
    return redirect(instantiateRouteBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
  }

  if (entryType === 'select-instance') {
    return redirect(instantiateRouteBuilders.instanceSelection({}));
  }

  throw new Error();
}

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
  return redirect(instantiateRouteBuilders.stateless({ pageId: '' })); // TODO: find out where to go
}
