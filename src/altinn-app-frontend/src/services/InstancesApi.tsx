import { appApi } from 'src/services/AppApi';

import type { IInstance } from 'altinn-shared/types';

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

export const instancesApi = appApi.injectEndpoints({
  endpoints: (builder) => ({
    instantiateWithPrefill: builder.mutation<IInstance, Instantiation>({
      query: (instantiation) => ({
        url: '/instances/create',
        method: 'POST',
        data: instantiation,
      }),
    }),
  }),
});

export const { useInstantiateWithPrefillMutation } = instancesApi;
