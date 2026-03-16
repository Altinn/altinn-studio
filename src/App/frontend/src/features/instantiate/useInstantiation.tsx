import { useNavigate } from 'react-router';

import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import type { MutateOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { InstanceApi } from 'src/core/api-client/instance.api';
import { instanceDataQueryOptions } from 'src/core/queries/instance/instance.queries';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import type { InstantiationPrefillData } from 'src/core/api-client/instance.api';
import type { IInstance } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export type Instantiation = InstantiationPrefillData;

type InstantiationArgs = number | Instantiation;
type Options<Vars> = MutateOptions<IInstance, AxiosError, Vars, unknown> & { force?: boolean };

export function useInstantiation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentLanguage = useCurrentLanguage();

  const { mutateAsync } = useMutation({
    mutationKey: ['instantiate'],
    mutationFn: async (args: InstantiationArgs) => {
      if (typeof args === 'number') {
        return InstanceApi.create(args, currentLanguage);
      }
      return InstanceApi.createWithPrefill(args, currentLanguage);
    },
    onError: (error: HttpClientError) => {
      window.logError(`Instantiation failed:\n`, error);
    },
    onSuccess: (data) => {
      const [instanceOwnerPartyId, instanceGuid] = data.id.split('/');
      const queryKey = instanceDataQueryOptions({
        instanceOwnerPartyId,
        instanceGuid,
      }).queryKey;
      queryClient.setQueryData(queryKey, data);

      navigate(`/instance/${data.id}`);
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
