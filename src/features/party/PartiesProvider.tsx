import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';

import { useAppMutations, useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import { useShouldFetchProfile } from 'src/features/profile/ProfileProvider';
import { useForcePromptForParty, usePromptForParty } from 'src/hooks/usePromptForParty';
import type { IParty } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const usePartiesQuery = () => {
  const enabled = useShouldFetchProfile();

  const { fetchParties } = useAppQueries();
  const utils = useQuery({
    enabled,
    queryKey: ['fetchUseParties'],
    queryFn: () => fetchParties(),
    onError: (error: HttpClientError) => {
      window.logError('Fetching parties failed:\n', error);
    },
  });

  return {
    ...utils,
    enabled,
  };
};

const useCurrentPartyQuery = (enabled: boolean) => {
  const { fetchCurrentParty } = useAppQueries();
  return useQuery({
    enabled,
    queryKey: ['fetchUseCurrentParty'],
    queryFn: () => fetchCurrentParty(),
    onError: (error: HttpClientError) => {
      window.logError('Fetching current party failed:\n', error);
    },
  });
};

const useSetCurrentPartyMutation = () => {
  const { doSetCurrentParty } = useAppMutations();
  return useMutation({
    mutationKey: ['doSetCurrentParty'],
    mutationFn: (party: IParty) => doSetCurrentParty.call(party.partyId),
    onSuccess: (result) => {
      doSetCurrentParty.setLastResult(result);
    },
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
  currentIsValid: boolean | undefined;
  setParty: (party: IParty) => Promise<IParty | undefined>;
}

const { Provider: RealCurrentPartyProvider, useCtx: useCurrentPartyCtx } = createContext<CurrentParty>({
  name: 'CurrentParty',
  required: false,
  default: {
    party: undefined,
    currentIsValid: undefined,
    setParty: () => {
      throw new Error('CurrentPartyProvider not initialized');
    },
  },
});

function FixedCurrentPartyProvider({
  value,
  mutateAsync,
  children,
}: PropsWithChildren<{
  value: IParty;
  mutateAsync: (party: IParty) => Promise<unknown>;
}>) {
  useEffect(() => {
    (async () => {
      await mutateAsync(value);
    })();
  }, [mutateAsync, value]);

  return (
    <RealCurrentPartyProvider
      value={{
        party: value,
        currentIsValid: true,
        setParty: async () => {
          throw new Error('Not possible to choose another party when only one is available');
        },
      }}
    >
      {children}
    </RealCurrentPartyProvider>
  );
}

const CurrentPartyProvider = ({ children }: PropsWithChildren) => {
  const validParties = usePartiesCtx() as IParty[];
  const prompt = usePromptForParty();
  const forcePrompt = useForcePromptForParty();
  const [sentToMutation, setSentToMutation] = useState<IParty | undefined>(undefined);
  const { mutateAsync, data: dataFromMutation, error: errorFromMutation } = useSetCurrentPartyMutation();
  const queryEnabled = validParties.length > 1 && !prompt;
  const { data: partyFromQuery, isLoading, error: errorFromQuery } = useCurrentPartyQuery(queryEnabled);

  if (queryEnabled && isLoading) {
    return <Loader reason={'current-party'} />;
  }

  const error = errorFromMutation || errorFromQuery;
  if (error) {
    return <DisplayError error={error} />;
  }

  if (!validParties.length) {
    return <NoValidPartiesError />;
  }

  if (validParties.length === 1 && !forcePrompt) {
    return (
      <FixedCurrentPartyProvider
        value={validParties[0]}
        mutateAsync={mutateAsync}
      >
        {children}
      </FixedCurrentPartyProvider>
    );
  }

  const partyFromMutation = dataFromMutation === 'Party successfully updated' ? sentToMutation : undefined;
  const currentParty = partyFromMutation ?? partyFromQuery;
  const currentIsValid = currentParty && validParties.some((party) => party.partyId === currentParty.partyId);

  return (
    <RealCurrentPartyProvider
      value={{
        party: currentParty,
        currentIsValid,
        setParty: async (party) => {
          try {
            setSentToMutation(party);
            const result = await mutateAsync(party);
            if (result === 'Party successfully updated') {
              return party;
            }
            return undefined;
          } catch (error) {
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
