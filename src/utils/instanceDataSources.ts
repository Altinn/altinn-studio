import type { IInstance, IInstanceDataSources } from 'src/types/shared';

export function buildInstanceDataSources(instance?: IInstance | null | undefined): IInstanceDataSources | null {
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
