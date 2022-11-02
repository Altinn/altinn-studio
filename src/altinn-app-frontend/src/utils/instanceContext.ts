import { createSelector } from 'reselect';

import type { IRuntimeState } from 'src/types';

import type { IInstance, IInstanceContext } from 'altinn-shared/types';

const getInstance = (state: IRuntimeState) => state.instanceData.instance;

export function buildInstanceContext(
  instance?: IInstance | null,
): IInstanceContext | null {
  if (!instance) {
    return null;
  }

  return {
    appId: instance.appId,
    instanceId: instance.id,
    instanceOwnerPartyId: instance.instanceOwner.partyId,
  };
}

let selector: any = undefined;
export const getInstanceContextSelector = () => {
  if (selector) {
    return selector;
  }

  selector = createSelector([getInstance], (instance) =>
    buildInstanceContext(instance),
  );

  return selector;
};
