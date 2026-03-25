import { useMutationState } from '@tanstack/react-query';

import { useCreateInstance } from 'src/core/queries/instance';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import type { Instantiation } from 'src/core/api-client/instance.api';
import type { IInstance } from 'src/types/shared';

export function useInstantiation() {
  const currentLanguage = useCurrentLanguage();

  const { createInstanceAsync } = useCreateInstance(currentLanguage);

  // Instead of using the return value above, we look up in the mutation cache. Tanstack query will keep the last
  // mutation as a local state, but that gets lost if our render context/order changes. Looking up from the cache
  // directly will always give us any mutations, even when we're not rendering from that same hook that caused the
  // last mutation.
  const mutations = useMutationState({ filters: { mutationKey: ['instantiate'] } });
  const hasAlreadyInstantiated = mutations.length > 0;
  const lastMutation = mutations.at(-1);

  return {
    instantiate: async (instanceOwnerPartyId: number, { force = false } = {}): Promise<IInstance | undefined> => {
      if (!hasAlreadyInstantiated || force) {
        return await createInstanceAsync(instanceOwnerPartyId).catch(() => undefined);
      }
    },
    instantiateWithPrefill: async (value: Instantiation, { force = false } = {}): Promise<IInstance | undefined> => {
      if (!hasAlreadyInstantiated || force) {
        return await createInstanceAsync(value).catch(() => undefined);
      }
    },

    error: lastMutation?.error,
    lastResult: lastMutation?.data as IInstance | undefined,
  };
}
