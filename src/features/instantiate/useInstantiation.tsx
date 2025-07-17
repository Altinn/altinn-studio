import { useNavigate } from 'react-router-dom';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MutateOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import type { IInstance } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export interface Prefill {
  [key: string]: unknown;
}

export interface InstanceOwner {
  partyId: string | undefined;
}

export interface Instantiation {
  instanceOwner: InstanceOwner;
  prefill: Prefill;
}

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
    onSuccess: async (data) => {
      navigate(`/instance/${data.id}`);
      await queryClient.invalidateQueries({ queryKey: ['fetchApplicationMetadata'] });
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
    onSuccess: async (data) => {
      navigate(`/instance/${data.id}`);
      await queryClient.invalidateQueries({ queryKey: ['fetchApplicationMetadata'] });
    },
  });
}

type Options<Vars> = MutateOptions<IInstance, AxiosError, Vars, unknown> & { force?: boolean };

export const useInstantiation = () => {
  const queryClient = useQueryClient();
  const instantiate = useInstantiateMutation();
  const instantiateWithPrefill = useInstantiateWithPrefillMutation();

  const hasAlreadyInstantiated = queryClient.getMutationCache().findAll({ mutationKey: ['instantiate'] }).length > 0;

  return {
    instantiate: async (instanceOwnerPartyId: number, { force = false, ...options }: Options<number> = {}) => {
      if (!hasAlreadyInstantiated || force) {
        await instantiate.mutateAsync(instanceOwnerPartyId, options).catch(() => {});
      }
    },
    instantiateWithPrefill: async (value: Instantiation, { force = false, ...options }: Options<Instantiation>) => {
      if (!hasAlreadyInstantiated || force) {
        await instantiateWithPrefill.mutateAsync(value, options).catch(() => {});
      }
    },

    error: instantiate.error || instantiateWithPrefill.error,
    lastResult: instantiate.data ?? instantiateWithPrefill.data,
  };
};
