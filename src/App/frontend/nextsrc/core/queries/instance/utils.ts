export function extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId(instanceId: string): {
  instanceOwnerPartyId: number;
  instanceGuid: string;
} {
  if (!isInstanceId(instanceId)) {
    throw new Error('The provided string is not an instance id.');
  }

  const [instanceOwnerPartyId, instanceGuid] = instanceId.split('/');
  return { instanceOwnerPartyId: Number.parseInt(instanceOwnerPartyId), instanceGuid };
}

function isInstanceId(instanceId: string): instanceId is `${string}/${string}` {
  return instanceId.includes('/');
}
