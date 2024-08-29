import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';

import { useAppMutations, useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import { reduceToValidParties } from 'src/features/party/partyProviderUtils';
import { useShouldFetchProfile } from 'src/features/profile/ProfileProvider';
import { type IParty } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

// Also used for prefetching @see appPrefetcher.ts, partyPrefetcher.ts
export function usePartiesQueryDef(enabled: boolean) {
  const { fetchParties } = useAppQueries();
  return {
    queryKey: ['fetchUseParties', enabled],
    queryFn: fetchParties,
    enabled,
  };
}

const usePartiesQuery = () => {
  const enabled = useShouldFetchProfile();

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
export function useCurrentPartyQueryDef(enabled: boolean) {
  const { fetchCurrentParty } = useAppQueries();
  return {
    queryKey: ['fetchUseCurrentParty', enabled],
    queryFn: fetchCurrentParty,
    enabled,
  };
}

const useCurrentPartyQuery = (enabled: boolean) => {
  const utils = useQuery(useCurrentPartyQueryDef(enabled));

  useEffect(() => {
    utils.error && window.logError('Fetching current party failed:\n', utils.error);
  }, [utils.error]);

  return utils;
};

const useSetCurrentPartyMutation = () => {
  const { doSetCurrentParty } = useAppMutations();
  return useMutation({
    mutationKey: ['doSetCurrentParty'],
    mutationFn: (party: IParty) => doSetCurrentParty(party.partyId),
    onError: (error: HttpClientError) => {
      window.logError('Setting current party failed:\n', error);
    },
  });
};

const { Provider: PartiesProvider, useCtx: usePartiesCtx } = delayedContext(() =>
  createQueryContext<IParty[] | undefined, false>({
    name: 'Parties',
    required: false,
    default: undefined,
    query: usePartiesQuery,
  }),
);

interface CurrentParty {
  party: IParty | undefined;
  validParties: IParty[] | undefined;
  currentIsValid: boolean | undefined;
  userHasSelectedParty: boolean | undefined;
  setUserHasSelectedParty: (hasSelected: boolean) => void;
  setParty: (party: IParty) => Promise<IParty | undefined>;
}

const { Provider: RealCurrentPartyProvider, useCtx: useCurrentPartyCtx } = createContext<CurrentParty>({
  name: 'CurrentParty',
  required: false,
  default: {
    party: undefined,
    validParties: undefined,
    currentIsValid: undefined,
    userHasSelectedParty: undefined,
    setUserHasSelectedParty: () => {
      throw new Error('CurrentPartyProvider not initialized');
    },
    setParty: () => {
      throw new Error('CurrentPartyProvider not initialized');
    },
  },
});

const CurrentPartyProvider = ({ children }: PropsWithChildren) => {
  const { partyTypesAllowed } = useApplicationMetadata();
  const validParties = reduceToValidParties(usePartiesCtx() as IParty[], partyTypesAllowed);
  const [sentToMutation, setSentToMutation] = useState<IParty | undefined>(undefined);
  const { mutateAsync, data: dataFromMutation, error: errorFromMutation } = useSetCurrentPartyMutation();
  const { data: partyFromQuery, isLoading, error: errorFromQuery } = useCurrentPartyQuery(true);
  const [userHasSelectedParty, setUserHasSelectedParty] = useState(false);

  if (isLoading) {
    return <Loader reason={'current-party'} />;
  }

  const error = errorFromMutation || errorFromQuery;
  if (error) {
    return <DisplayError error={error} />;
  }

  if (!validParties.length) {
    return <NoValidPartiesError />;
  }

  const partyFromMutation = dataFromMutation === 'Party successfully updated' ? sentToMutation : undefined;
  const currentParty = partyFromMutation ?? partyFromQuery;
  const currentIsValid = currentParty && validParties.some((party) => party.partyId === currentParty.partyId);

  return (
    <RealCurrentPartyProvider
      value={{
        party: currentParty,
        validParties,
        currentIsValid,
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
    </RealCurrentPartyProvider>
  );
};

export function PartyProvider({ children }: PropsWithChildren) {
  const shouldFetchProfile = useShouldFetchProfile();

  if (!shouldFetchProfile) {
    return <>{children}</>;
  }

  return (
    <PartiesProvider>
      <CurrentPartyProvider>{children}</CurrentPartyProvider>
    </PartiesProvider>
  );
}

export const useParties = () => usePartiesCtx();

/**
 * Returns the current party, or the custom selected current party if one is set.
 * Please note that the current party might not be allowed to instantiate, so you should
 * check the `canInstantiate` property as well.
 */
export const useCurrentParty = () => useCurrentPartyCtx().party;
export const useCurrentPartyIsValid = () => useCurrentPartyCtx().currentIsValid;
export const useSetCurrentParty = () => useCurrentPartyCtx().setParty;

export const useValidParties = () => useCurrentPartyCtx().validParties;

export const useHasSelectedParty = () => useCurrentPartyCtx().userHasSelectedParty;

export const useSetHasSelectedParty = () => useCurrentPartyCtx().setUserHasSelectedParty;
