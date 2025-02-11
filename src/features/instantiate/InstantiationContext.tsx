import React, { useEffect, useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
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
}

const { Provider, useCtx } = createContext<InstantiationContext>({ name: 'InstantiationContext', required: true });

function useInstantiateMutation() {
  const { doInstantiate } = useAppMutations();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentLanguage = useCurrentLanguage();

  return useMutation({
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
  const instantiate = useInstantiateMutation();
  const instantiateWithPrefill = useInstantiateWithPrefillMutation();
  const [busyWithId, setBusyWithId] = useState<string | undefined>(undefined);
  const isInstantiatingRef = useRef(false);

  // Redirect to the instance page when instantiation completes
  useEffect(() => {
    if (instantiate.data?.id) {
      setBusyWithId(undefined);
      isInstantiatingRef.current = false;
    }
    if (instantiateWithPrefill.data?.id) {
      setBusyWithId(undefined);
      isInstantiatingRef.current = false;
    }
    if (instantiate.error || instantiateWithPrefill.error) {
      isInstantiatingRef.current = false;
    }
  }, [instantiate.data?.id, instantiateWithPrefill.data?.id, instantiate.error, instantiateWithPrefill.error]);

  return (
    <Provider
      value={{
        instantiate: (node, instanceOwnerPartyId) => {
          if (instantiate.data || instantiate.isPending || isInstantiatingRef.current) {
            return;
          }
          isInstantiatingRef.current = true;
          setBusyWithId(node ? node.id : 'unknown');
          instantiate.mutate(instanceOwnerPartyId);
        },
        instantiateWithPrefill: (node, value) => {
          if (instantiateWithPrefill.data || instantiateWithPrefill.isPending || isInstantiatingRef.current) {
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
