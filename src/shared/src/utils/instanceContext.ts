import type { IInstance, IInstanceContext } from '../types';

export function buildInstanceContext(instance: IInstance): IInstanceContext {
  if (!instance) {
    return null;
  }

  const instanceContext: IInstanceContext = {
    appId: instance.appId,
    instanceId: instance.id,
    instanceOwnerPartyId: instance.instanceOwner.partyId,
  };

  return instanceContext;
}
