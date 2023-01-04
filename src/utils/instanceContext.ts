import { createSelector } from 'reselect';

import type { IRuntimeState } from 'src/types';
import type { IInstance, IInstanceContext } from 'src/types/shared';

const getInstance = (state: IRuntimeState) => state.instanceData.instance;

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

let selector: any = undefined;
export const getInstanceContextSelector = () => {
  if (selector) {
    return selector;
  }

  selector = createSelector([getInstance], (instance) => buildInstanceContext(instance));

  return selector;
};
