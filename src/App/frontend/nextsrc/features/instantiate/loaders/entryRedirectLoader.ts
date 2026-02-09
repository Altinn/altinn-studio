import { redirect } from 'react-router-dom';

import { GlobalData } from 'nextsrc/core/globalData';
import { ServerStatusCodes } from 'nextsrc/core/serverStatusCodes';
import { InstanceApi } from 'nextsrc/features/instantiate/api';
import { InstantiateRoutes } from 'nextsrc/features/instantiate/routes';

type EntryAction = () => Promise<Response>;
type ShowTypes = 'select-instance' | 'new-instance';

export async function entryRedirectLoader(): Promise<Response> {
  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  const action = entryType && entryActions[entryType];
  return action ? action() : redirect(InstantiateRoutes.stateless);
}

const entryActions: Record<ShowTypes, EntryAction> = {
  'select-instance': selectInstance,
  'new-instance': createNewInstance,
};

async function selectInstance(): Promise<Response> {
  return redirect(InstantiateRoutes.instanceSelection);
}

async function createNewInstance(): Promise<Response> {
  const profile = GlobalData.userProfile;
  if (!profile) {
    throw new Response('User profile not available', { status: ServerStatusCodes.Unauthorized });
  }
  const instance = await InstanceApi.create(profile.partyId);
  return redirect(InstantiateRoutes.forInstance(instance));
}
