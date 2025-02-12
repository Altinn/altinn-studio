import React, { useEffect, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useNavigate } from 'src/features/routing/AppRoutingContext';
import type { IInstance } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
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
  instantiate: (node: LayoutNode | undefined, instanceOwnerPartyId: number) => void;
  instantiateWithPrefill: (node: LayoutNode | undefined, instantiation: Instantiation) => void;

  busyWithId: string | undefined;
  error: AxiosError | undefined | null;
  isLoading: boolean;
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
  const [busyWithId, setBusyWithId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (instantiate.data?.id) {
      setBusyWithId(undefined);
    }
    if (instantiateWithPrefill.data?.id) {
      setBusyWithId(undefined);
    }
  }, [instantiate.data?.id, instantiateWithPrefill.data?.id]);

  return (
    <Provider
      value={{
        instantiate: (node, instanceOwnerPartyId) => {
          if (!mutationHasBeenFired(queryClient)) {
            setBusyWithId(node ? node.id : 'unknown');
            instantiate.mutate(instanceOwnerPartyId);
          }
        },
        instantiateWithPrefill: (node, value) => {
          if (!mutationHasBeenFired(queryClient)) {
            setBusyWithId(node ? node.id : 'unknown');
            instantiateWithPrefill.mutate(value);
          }
        },
        clear: () => {
          removeMutations(queryClient);
          setBusyWithId(undefined);
        },

        busyWithId,
        error: instantiate.error || instantiateWithPrefill.error,
        isLoading: instantiate.isPending || instantiateWithPrefill.isPending,
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
