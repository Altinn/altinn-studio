import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppMutations, useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { instanceQueries, useInstanceDataQueryArgs } from 'src/features/instance/InstanceContext';
import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import { flattenParties } from 'src/features/party/partyUtils';
// import { useShouldFetchProfile } from 'src/features/profile/ProfileProvider';
import type { IInstance, IParty } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const partyQueryKeys = {
  all: ['parties'] as const,
  allowedToInstantiate: () => [...partyQueryKeys.all, 'allowedToInstantiate'] as const,
};

// Also used for prefetching @see appPrefetcher.ts, partyPrefetcher.ts
export function usePartiesQueryDef(enabled: boolean) {
  const { fetchPartiesAllowedToInstantiate } = useAppQueries();
  return {
    queryKey: partyQueryKeys.allowedToInstantiate(),
    queryFn: fetchPartiesAllowedToInstantiate,
    enabled,
  };
}

const usePartiesAllowedToInstantiateQuery = () => {
  const enabled = true;

  const utils = useQuery(usePartiesQueryDef(enabled));

  useEffect(() => {
    utils.error && window.logError('Fetching parties failed:\n', utils.error);
  }, [utils.error]);

  return {
    ...utils,
    enabled,
  };
};

// Also used for prefetching @see appPrefetcher.ts, partyPrefetcher.ts
export function useSelectedPartyQueryDef(enabled: boolean) {
  const { fetchSelectedParty } = useAppQueries();
  return {
    queryKey: ['fetchUseSelectedParty', enabled],
    queryFn: fetchSelectedParty,
    enabled,
  };
}

const useSelectedPartyQuery = (enabled: boolean) => {
  const query = useQuery(useSelectedPartyQueryDef(enabled));

  useEffect(() => {
    query.error && window.logError('Fetching current party failed:\n', query.error);
  }, [query.error]);

  return query;
};

const useSetSelectedPartyMutation = () => {
  const { doSetSelectedParty } = useAppMutations();
  return useMutation({
    mutationKey: ['doSetSelectedParty'],
    mutationFn: (party: IParty) => doSetSelectedParty(party.partyId),
    onError: (error: HttpClientError) => {
      window.logError('Setting current party failed:\n', error);
    },
  });
};

const { Provider: PartiesProvider, useCtx: usePartiesAllowedToInstantiateCtx } = delayedContext(() =>
  createQueryContext<IParty[] | undefined, false>({
    name: 'Parties',
    required: false,
    default: undefined,
    query: usePartiesAllowedToInstantiateQuery,
  }),
);

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
  const validParties = useValidParties();
  const [sentToMutation, setSentToMutation] = useState<IParty | undefined>(undefined);
  const { mutateAsync, data: dataFromMutation, error: errorFromMutation } = useSetSelectedPartyMutation();
  const { data: partyFromQuery, isLoading, error: errorFromQuery } = useSelectedPartyQuery(true);
  const [userHasSelectedParty, setUserHasSelectedParty] = useState(false);

  if (isLoading) {
    return <Loader reason='current-party' />;
  }

  const error = errorFromMutation || errorFromQuery;
  if (error) {
    return <DisplayError error={error} />;
  }

  if (!validParties?.length) {
    return <NoValidPartiesError />;
  }

  const partyFromMutation = dataFromMutation === 'Party successfully updated' ? sentToMutation : undefined;
  const selectedParty = partyFromMutation ?? partyFromQuery;
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
            const result = await mutateAsync(party);
            if (result === 'Party successfully updated') {
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
  const shouldFetchProfile = true;

  if (!shouldFetchProfile) {
    return children;
  }

  return (
    <PartiesProvider>
      <SelectedPartyProvider>{children}</SelectedPartyProvider>
    </PartiesProvider>
  );
}

export const usePartiesAllowedToInstantiate = () => usePartiesAllowedToInstantiateCtx();

/**
 * Returns the current party, or the custom selected current party if one is set.
 * Please note that the current party might not be allowed to instantiate, so you should
 * check the `canInstantiate` property as well.
 */
export const useSelectedParty = () => useSelectedPartyCtx().party;
export const useSelectedPartyIsValid = () => useSelectedPartyCtx().selectedIsValid;
export const useSetSelectedParty = () => useSelectedPartyCtx().setParty;

export const useValidParties = () => flattenParties(usePartiesAllowedToInstantiateCtx() ?? []);

export const useHasSelectedParty = () => useSelectedPartyCtx().userHasSelectedParty;

export const useSetHasSelectedParty = () => useSelectedPartyCtx().setUserHasSelectedParty;

export function useInstanceOwnerParty(): IParty | null {
  const parties = usePartiesAllowedToInstantiate() ?? [];
  const queryClient = useQueryClient();

  const instanceOwner = queryClient.getQueryData<IInstance>(
    instanceQueries.instanceData(useInstanceDataQueryArgs()).queryKey,
  )?.instanceOwner;

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
