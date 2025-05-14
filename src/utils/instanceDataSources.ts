import type { IInstance, IInstanceDataSources, IParty } from 'src/types/shared';

export function buildInstanceDataSources(
  instance: IInstance | null | undefined,
  instanceOwnerParty: IParty | null | undefined = instance?.instanceOwner?.party,
): IInstanceDataSources | null {
  if (!instance?.instanceOwner) {
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
    instanceOwnerName: instanceOwnerParty?.name,
  };
}
