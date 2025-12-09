import type { PropsWithChildren } from 'react';

import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import type { IParty } from 'src/types/shared';

/**
 * Returns the current party from window.AltinnAppData.userProfile
 */
export const useSelectedParty = (): IParty | undefined => window.AltinnAppData?.userProfile?.party;

/**
 * Returns undefined - parties list is only fetched on party-selection page
 * @deprecated Use local query on party-selection page instead
 */
export const usePartiesAllowedToInstantiate = (): IParty[] | undefined => undefined;

/**
 * Returns true if a party is currently selected
 * @deprecated
 */
export const useSelectedPartyIsValid = (): boolean => Boolean(useSelectedParty());

/**
 * Returns a no-op function - party setting is handled on party-selection page
 * @deprecated Use local mutation on party-selection page instead
 */
export const useSetSelectedParty = () => async (_party: IParty) => {
  window.logWarn('useSetSelectedParty is deprecated - use local mutation on party-selection page');
  return undefined;
};

/**
 * Returns empty array - parties list is only fetched on party-selection page
 * @deprecated Use local query on party-selection page instead
 */
export const useValidParties = (): IParty[] => [];

/**
 * Returns false - not used anymore
 * @deprecated
 */
export const useHasSelectedParty = (): boolean => false;

/**
 * Returns a no-op function - not used anymore
 * @deprecated
 */
export const useSetHasSelectedParty = () => (_hasSelected: boolean) => {
  // No-op
};

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

// Legacy export for backward compatibility
export const PartyProvider = ({ children }: PropsWithChildren) => children;
