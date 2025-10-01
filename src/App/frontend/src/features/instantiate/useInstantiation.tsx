import { useNavigate } from 'react-router-dom';

import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import type { MutateOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { instanceQueries } from 'src/features/instance/InstanceContext';
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

type InstantiationArgs = number | Instantiation;
type Options<Vars> = MutateOptions<IInstance, AxiosError, Vars, unknown> & { force?: boolean };

export function useInstantiation() {
  const { doInstantiate, doInstantiateWithPrefill } = useAppMutations();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentLanguage = useCurrentLanguage();

  const { mutateAsync } = useMutation({
    mutationKey: ['instantiate'],
    mutationFn: (args: InstantiationArgs) =>
      typeof args === 'number' ? doInstantiate(args, currentLanguage) : doInstantiateWithPrefill(args, currentLanguage),
    onError: (error: HttpClientError) => {
      window.logError(`Instantiation failed:\n`, error);
    },
    onSuccess: async (data) => {
      const [instanceOwnerPartyId, instanceGuid] = data.id.split('/');
      const queryKey = instanceQueries.instanceData({
        instanceOwnerPartyId,
        instanceGuid,
      }).queryKey;
      queryClient.setQueryData(queryKey, data);

      navigate(`/instance/${data.id}`);
      await queryClient.invalidateQueries({ queryKey: ['fetchApplicationMetadata'] });
    },
  });

  // Instead of using the return value above, we look up in the mutation cache. Tanstack query will keep the last
  // mutation as a local state, but that gets lost if our render context/order changes. Looking up from the cache
  // directly will always give us any mutations, even when we're not rendering from that same hook that caused the
  // last mutation.
  const mutations = useMutationState({ filters: { mutationKey: ['instantiate'] } });
  const hasAlreadyInstantiated = mutations.length > 0;
  const lastMutation = mutations.at(-1);

  return {
    instantiate: async (instanceOwnerPartyId: number, { force = false, ...options }: Options<number> = {}) => {
      if (!hasAlreadyInstantiated || force) {
        await mutateAsync(instanceOwnerPartyId, options).catch(() => {});
      }
    },
    instantiateWithPrefill: async (value: Instantiation, { force = false, ...options }: Options<Instantiation>) => {
      if (!hasAlreadyInstantiated || force) {
        await mutateAsync(value, options).catch(() => {});
      }
    },

    error: lastMutation?.error,
    lastResult: lastMutation?.data,
  };
}
