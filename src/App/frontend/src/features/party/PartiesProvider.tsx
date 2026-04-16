import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useCurrentInstance } from 'src/core/queries/instance';
import {
  usePartiesAllowedToInstantiate as usePartiesAllowedToInstantiateBase,
  useSetSelectedParty as useSetSelectedPartyMutation,
} from 'src/core/queries/party';
import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import { flattenParties } from 'src/features/party/partyUtils';
import { useAllowAnonymous } from 'src/features/stateless/getAllowAnonymous';
import { GlobalData } from 'src/GlobalData';
import type { IParty } from 'src/types/shared';

const usePartiesAllowedToInstantiateQuery = () => {
  const allowAnonymous = useAllowAnonymous();

  const utils = usePartiesAllowedToInstantiateBase({ enabled: !allowAnonymous });

  useEffect(() => {
    utils.error && window.logError('Fetching parties failed:\n', utils.error);
  }, [utils.error]);

  return {
    ...utils,
    data: utils.parties,
    enabled: !allowAnonymous,
  };
};

interface SelectedParty {
  party: IParty | undefined;
  selectedIsValid: boolean | undefined;
  userHasSelectedParty: boolean | undefined;
  setUserHasSelectedParty: (hasSelected: boolean) => void;
  setParty: (party: IParty) => Promise<IParty | undefined>;
}

const { Provider: RealSelectedPartyProvider, useCtx: useSelectedPartyCtx } = createContext<SelectedParty>({
  name: 'SelectedParty',
  required: false,
  default: {
    party: undefined,
    selectedIsValid: undefined,
    userHasSelectedParty: undefined,
    setUserHasSelectedParty: () => {
      throw new Error('SelectedPartyProvider not initialized');
    },
    setParty: () => {
      throw new Error('SelectedPartyProvider not initialized');
    },
  },
});

/*
 * This provider is used to manage the selected party and its validity _before_ any instance is present.
 * That is, the selected party should only be used to determine the party that is used to instantiate an app or to select from previously instantiated apps.
 * When the user is filling out an app, the current party is always the user's party, found in the profile, filling out the form on behalf of the instance owner.
 */
const SelectedPartyProvider = ({ children }: PropsWithChildren) => {
  const { data: validPartiesHierarchy, isPending, error } = usePartiesAllowedToInstantiateQuery();
  const validParties = flattenParties(validPartiesHierarchy ?? []);
  const [sentToMutation, setSentToMutation] = useState<IParty | undefined>(undefined);
  const {
    setSelectedPartyAsync: mutateAsync,
    data: dataFromMutation,
    error: errorFromMutation,
  } = useSetSelectedPartyMutation();
  const [userHasSelectedParty, setUserHasSelectedParty] = useState(false);

  if (isPending) {
    return <Loader reason='query-Parties' />;
  }

  if (error) {
    return <DisplayError error={error} />;
  }

  if (errorFromMutation) {
    return <DisplayError error={errorFromMutation} />;
  }

  if (!validParties?.length) {
    return <NoValidPartiesError />;
  }

  const partyFromMutation = dataFromMutation === 'Party successfully updated' ? sentToMutation : undefined;
  const selectedParty = partyFromMutation ?? GlobalData.getSelectedParty();
  const selectedIsValid = selectedParty && validParties?.some((party) => party.partyId === selectedParty.partyId);

  return (
    <RealSelectedPartyProvider
      value={{
        party: selectedParty,
        selectedIsValid,
        userHasSelectedParty,
        setUserHasSelectedParty: (hasSelected: boolean) => setUserHasSelectedParty(hasSelected),
        setParty: async (party) => {
          try {
            setSentToMutation(party);
            const result = await mutateAsync({ partyId: party.partyId });
            if (result === 'Party successfully updated') {
              GlobalData.setSelectedParty(party);
              return party;
            }
            return undefined;
          } catch (_err) {
            // Ignoring error here, as it's handled by this provider
          }
        },
      }}
    >
      {children}
    </RealSelectedPartyProvider>
  );
};

export function PartyProvider({ children }: PropsWithChildren) {
  const allowAnonymous = useAllowAnonymous();
  if (allowAnonymous) {
    return children;
  }

  return <SelectedPartyProvider>{children}</SelectedPartyProvider>;
}

export const usePartiesAllowedToInstantiate = () => usePartiesAllowedToInstantiateQuery().data;

/**
 * Returns the current party, or the custom selected current party if one is set.
 * Please note that the current party might not be allowed to instantiate, so you should
 * check the `canInstantiate` property as well.
 */
export const useSelectedParty = () => useSelectedPartyCtx().party;
export const useSelectedPartyIsValid = () => useSelectedPartyCtx().selectedIsValid;
export const useSetSelectedParty = () => useSelectedPartyCtx().setParty;

export const useHasSelectedParty = () => useSelectedPartyCtx().userHasSelectedParty;

export const useSetHasSelectedParty = () => useSelectedPartyCtx().setUserHasSelectedParty;

export function useInstanceOwnerParty(): IParty | null {
  const parties = usePartiesAllowedToInstantiate() ?? [];
  const instance = useCurrentInstance();

  const instanceOwner = instance?.instanceOwner;

  if (!instanceOwner) {
    return null;
  }

  // If the backend is updated to v8.6.0 it will return the whole party object on the instance owner,
  // so we can use that directly.
  if (instanceOwner?.party) {
    return instanceOwner.party;
  }

  // Backwards compatibility: if the backend returns only the partyId, we need to find the party in the list of parties.
  // This logic assumes that the current logged in user has "access" to the party of the instance owner,
  // as the parties array comes from the current users party list.
  return flattenParties(parties)?.find((party) => party.partyId.toString() === instanceOwner.partyId) ?? null;
}
