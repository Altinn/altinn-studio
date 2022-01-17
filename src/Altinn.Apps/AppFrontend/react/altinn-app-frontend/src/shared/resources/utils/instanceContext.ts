import { IInstance, IInstanceContext } from 'altinn-shared/types';

export function buildInstanceContext(instance: IInstance): IInstanceContext {
  const appContext: IInstanceContext = {
    appId: instance.appId,
    instanceId: instance.id,
    instanceOwnerPartyId: instance.instanceOwner.partyId,
  }
  return appContext;
}