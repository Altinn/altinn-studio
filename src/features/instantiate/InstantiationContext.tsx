import React, { useEffect } from 'react';
import type { MutableRefObject } from 'react';

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
  clearTimeout: MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  cancelClearTimeout: () => void;
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
  const clearRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
          if (clearRef.current) {
            clearTimeout(clearRef.current);
          }
          clearRef.current = setTimeout(() => {
            removeMutations(queryClient);
            instantiate.reset();
            instantiateWithPrefill.reset();
          }, TIMEOUT);
        },
        cancelClearTimeout: () => {
          if (clearRef.current) {
            clearTimeout(clearRef.current);
          }
        },
        clearTimeout: clearRef,

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

/* When this component is unmounted, we clear the instantiation to allow users to start a new instance later. This is
 * needed for (for example) navigating back to party selection or instance selection, and then creating a new instance
 * from there. However, React may decide to unmount this component and then mount it again quickly, so in those
 * cases we want to avoid clearing the instantiation too soon (and cause a bug we had for a while where two instances
 * would be created in quick succession). */
const TIMEOUT = 500;

export function useClearInstantiation(force: boolean = false) {
  const instantiation = useInstantiation();
  const shouldClear = !!instantiation.error || force;
  const clearInstantiation = instantiation.clear;
  instantiation.cancelClearTimeout();

  // Clear the instantiation when the component is unmounted to allow users to start a new instance later (without
  // having the baggage of the previous instantiation error).
  useEffect(() => () => (shouldClear ? clearInstantiation() : undefined), [clearInstantiation, shouldClear]);
}
