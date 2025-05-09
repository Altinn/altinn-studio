import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useNavigate } from 'src/features/routing/AppRoutingContext';
import type { IInstance } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export interface Prefill {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface InstanceOwner {
  partyId: string | undefined;
}

export interface Instantiation {
  instanceOwner: InstanceOwner;
  prefill: Prefill;
}

interface InstantiationContext {
  instantiate: (instanceOwnerPartyId: number, force?: boolean) => Promise<void>;
  instantiateWithPrefill: (instantiation: Instantiation, force?: boolean) => Promise<void>;

  error: AxiosError | undefined | null;
  lastResult: IInstance | undefined;
}

const { Provider, useCtx } = createContext<InstantiationContext>({ name: 'InstantiationContext', required: true });

function useInstantiateMutation() {
  const { doInstantiate } = useAppMutations();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentLanguage = useCurrentLanguage();

  return useMutation({
    mutationKey: ['instantiate', 'simple'],
    mutationFn: (instanceOwnerPartyId: number) => doInstantiate(instanceOwnerPartyId, currentLanguage),
    onError: (error: HttpClientError) => {
      window.logError('Instantiation failed:\n', error);
    },
    onSuccess: (data) => {
      navigate(`/instance/${data.id}`);
      queryClient.invalidateQueries({ queryKey: ['fetchApplicationMetadata'] });
    },
  });
}

function useInstantiateWithPrefillMutation() {
  const { doInstantiateWithPrefill } = useAppMutations();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentLanguage = useCurrentLanguage();

  return useMutation({
    mutationKey: ['instantiate', 'withPrefill'],
    mutationFn: (instantiation: Instantiation) => doInstantiateWithPrefill(instantiation, currentLanguage),
    onError: (error: HttpClientError) => {
      window.logError('Instantiation with prefill failed:\n', error);
    },
    onSuccess: (data) => {
      navigate(`/instance/${data.id}`);
      queryClient.invalidateQueries({ queryKey: ['fetchApplicationMetadata'] });
    },
  });
}

export function InstantiationProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient();
  const instantiate = useInstantiateMutation();
  const instantiateWithPrefill = useInstantiateWithPrefillMutation();

  return (
    <Provider
      value={{
        instantiate: async (instanceOwnerPartyId, force = false) => {
          if (!mutationHasBeenFired(queryClient) || force) {
            await instantiate.mutateAsync(instanceOwnerPartyId).catch(() => {});
          }
        },
        instantiateWithPrefill: async (value, force = false) => {
          if (!mutationHasBeenFired(queryClient) || force) {
            await instantiateWithPrefill.mutateAsync(value).catch(() => {});
          }
        },

        error: instantiate.error || instantiateWithPrefill.error,
        lastResult: instantiate.data ?? instantiateWithPrefill.data,
      }}
    >
      <ClearMutationWhenUrlChanges
        instantiate={instantiate}
        instantiateWithPrefill={instantiateWithPrefill}
      />
      {children}
    </Provider>
  );
}

export const useInstantiation = () => useCtx();

function mutationHasBeenFired(queryClient: QueryClient): boolean {
  const mutations = queryClient.getMutationCache().findAll({ mutationKey: ['instantiate'] });
  return mutations.length > 0;
}

function removeMutations(queryClient: QueryClient) {
  const mutations = queryClient.getMutationCache().findAll({ mutationKey: ['instantiate'] });
  mutations.forEach((mutation) => queryClient.getMutationCache().remove(mutation));
}

/**
 * When the URL changes (possibly because we redirected to the instance or because the user went
 * back to party selection after getting an error), we should clear the instantiation. We do this so that we're ready
 * for a possible next instantiation (when the user comes back to try instantiation again). This is needed
 * because the components that trigger instantiation might do so repeatedly - and we need to stop that.
 *
 * Some places instantiate as a direct result of a user action (clicking a button). Those will force
 * re-instantiation anyway and won't care if the previous instantiation was cleared before trying again.
 */
function ClearMutationWhenUrlChanges({
  instantiate,
  instantiateWithPrefill,
}: {
  instantiate: UseMutationResult;
  instantiateWithPrefill: UseMutationResult;
}) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const reset1 = instantiate.reset;
  const reset2 = instantiateWithPrefill.reset;

  useEffect(() => {
    removeMutations(queryClient);
    reset1();
    reset2();
  }, [location, queryClient, reset1, reset2]);

  return null;
}
