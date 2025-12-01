import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import type { IParty } from 'src/types/shared';

/**
 * Returns the current party from window.AltinnAppData.userProfile
 */
export const useSelectedParty = (): IParty | undefined => window.AltinnAppGlobalData?.userProfile?.party;
/**
 * Returns true if a party is currently selected
 * @deprecated
 */
export const useSelectedPartyIsValid = (): boolean => Boolean(useSelectedParty());
/**
 * Returns the instance owner party from window data
 */
export function useInstanceOwnerParty(): IParty | null {
  const instance = useInstanceDataQuery().data;

  const instanceOwner = instance?.instanceOwner;

  if (!instanceOwner) {
    return null;
  }

  // If the backend is updated to v8.6.0 it will return the whole party object on the instance owner
  if (instanceOwner?.party) {
    return instanceOwner.party;
  }

  // For backwards compatibility, return null if we don't have the full party object
  // The consuming code should handle this case
  return null;
}
