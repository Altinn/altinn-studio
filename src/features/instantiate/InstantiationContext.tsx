import React from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
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
  instantiate: (instanceOwnerPartyId: number) => Promise<void>;
  instantiateWithPrefill: (instantiation: Instantiation) => Promise<void>;

  error: AxiosError | undefined | null;
  lastResult: IInstance | undefined;
  clear: () => void;
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
        instantiate: async (instanceOwnerPartyId) => {
          if (!mutationHasBeenFired(queryClient)) {
            await instantiate.mutateAsync(instanceOwnerPartyId).catch(() => {});
          }
        },
        instantiateWithPrefill: async (value) => {
          if (!mutationHasBeenFired(queryClient)) {
            await instantiateWithPrefill.mutateAsync(value).catch(() => {});
          }
        },
        clear: () => {
          removeMutations(queryClient);
        },

        error: instantiate.error || instantiateWithPrefill.error,
        lastResult: instantiate.data ?? instantiateWithPrefill.data,
      }}
    >
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
