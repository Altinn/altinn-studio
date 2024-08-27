import React, { useEffect, useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
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
}

const { Provider, useCtx } = createContext<InstantiationContext>({ name: 'InstantiationContext', required: true });

function useInstantiateMutation() {
  const { doInstantiate } = useAppMutations();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (instanceOwnerPartyId: number) => doInstantiate(instanceOwnerPartyId),
    onError: (error: HttpClientError) => {
      window.logError('Instantiation failed:\n', error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fetchApplicationMetadata'] });
    },
  });
}

function useInstantiateWithPrefillMutation() {
  const { doInstantiateWithPrefill } = useAppMutations();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (instantiation: Instantiation) => doInstantiateWithPrefill(instantiation),
    onError: (error: HttpClientError) => {
      window.logError('Instantiation with prefill failed:\n', error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fetchApplicationMetadata'] });
    },
  });
}

export function InstantiationProvider({ children }: React.PropsWithChildren) {
  const instantiate = useInstantiateMutation();
  const instantiateWithPrefill = useInstantiateWithPrefillMutation();
  const [busyWithId, setBusyWithId] = useState<string | undefined>(undefined);
  const isInstantiatingRef = useRef(false);
  const navigate = useNavigate();

  // Redirect to the instance page when instantiation completes
  useEffect(() => {
    if (instantiate.data?.id) {
      navigate(`/instance/${instantiate.data.id}`);
      setBusyWithId(undefined);
      isInstantiatingRef.current = false;
    }
    if (instantiateWithPrefill.data?.id) {
      navigate(`/instance/${instantiateWithPrefill.data.id}`);
      setBusyWithId(undefined);
      isInstantiatingRef.current = false;
    }
  }, [instantiate.data?.id, instantiateWithPrefill.data?.id, navigate]);

  return (
    <Provider
      value={{
        instantiate: (node, instanceOwnerPartyId) => {
          if (instantiate.data || instantiate.isPending || instantiate.error || isInstantiatingRef.current) {
            return;
          }
          isInstantiatingRef.current = true;
          setBusyWithId(node ? node.id : 'unknown');
          instantiate.mutate(instanceOwnerPartyId);
        },
        instantiateWithPrefill: (node, value) => {
          if (instantiateWithPrefill.data || instantiateWithPrefill.isPending || instantiateWithPrefill.error) {
            return;
          }
          isInstantiatingRef.current = true;
          setBusyWithId(node ? node.id : 'unknown');
          instantiateWithPrefill.mutate(value);
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
