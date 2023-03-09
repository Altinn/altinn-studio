import type { IInstance, IInstanceContext } from 'src/types/shared';

export function buildInstanceContext(instance?: IInstance | null): IInstanceContext | null {
  if (!instance || !instance.instanceOwner) {
    return null;
  }
  const instanceOwnerPartyType = instance.instanceOwner.organisationNumber
    ? 'org'
    : instance.instanceOwner.personNumber
    ? 'person'
    : instance.instanceOwner.username
    ? 'selfIdentified'
    : 'unknown';

  return {
    appId: instance.appId,
    instanceId: instance.id,
    instanceOwnerPartyId: instance.instanceOwner?.partyId,
    instanceOwnerPartyType,
  };
}
