import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import type { IInstance } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export interface Prefill {
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
  instantiate: (node: LayoutNode | undefined, instanceOwnerPartyId: string) => void;
  instantiateWithPrefill: (node: LayoutNode | undefined, instantiation: Instantiation) => void;

  busyWithId: string | undefined;
  error: AxiosError | undefined | null;
  isLoading: boolean;
  lastResult: IInstance | undefined;
}

const { Provider, useCtx } = createContext<InstantiationContext>({ name: 'InstantiationContext', required: true });

function useInstantiateMutation() {
  const { doInstantiate } = useAppMutations();

  return useMutation({
    mutationFn: (instanceOwnerPartyId: string) => doInstantiate.call(instanceOwnerPartyId),
    onSuccess: (data: IInstance) => {
      doInstantiate.setLastResult(data);
    },
    onError: (error: HttpClientError) => {
      window.logError('Instantiation failed:\n', error);
    },
  });
}

function useInstantiateWithPrefillMutation() {
  const { doInstantiateWithPrefill } = useAppMutations();

  return useMutation({
    mutationFn: (instantiation: Instantiation) => doInstantiateWithPrefill.call(instantiation),
    onSuccess: (data: IInstance) => {
      doInstantiateWithPrefill.setLastResult(data);
    },
    onError: (error: HttpClientError) => {
      window.logError('Instantiation with prefill failed:\n', error);
    },
  });
}

export function InstantiationProvider({ children }: React.PropsWithChildren) {
  const navigate = useNavigate();
  const instantiate = useInstantiateMutation();
  const instantiateWithPrefill = useInstantiateWithPrefillMutation();
  const [busyWithId, setBusyWithId] = useState<string | undefined>(undefined);

  // Redirect to the instance page when instantiation completes
  useEffect(() => {
    if (instantiate.data?.id) {
      navigate(`instance/${instantiate.data.id}`);
      setBusyWithId(undefined);
    }
    if (instantiateWithPrefill.data?.id) {
      navigate(`instance/${instantiateWithPrefill.data.id}`);
      setBusyWithId(undefined);
    }
  }, [instantiate.data?.id, instantiateWithPrefill.data?.id, navigate]);

  return (
    <Provider
      value={{
        instantiate: (node, instanceOwnerPartyId) => {
          if (instantiate.data || instantiate.isLoading || instantiate.error) {
            return;
          }
          setBusyWithId(node ? node.item.id : 'unknown');
          instantiate.mutate(instanceOwnerPartyId);
        },
        instantiateWithPrefill: (node, value) => {
          if (instantiateWithPrefill.data || instantiateWithPrefill.isLoading || instantiateWithPrefill.error) {
            return;
          }
          setBusyWithId(node ? node.item.id : 'unknown');
          instantiateWithPrefill.mutate(value);
        },

        busyWithId,
        error: instantiate.error || instantiateWithPrefill.error,
        isLoading: instantiate.isLoading || instantiateWithPrefill.isLoading,
        lastResult: instantiate.data ?? instantiateWithPrefill.data,
      }}
    >
      {children}
    </Provider>
  );
}

export const useInstantiation = () => useCtx();
