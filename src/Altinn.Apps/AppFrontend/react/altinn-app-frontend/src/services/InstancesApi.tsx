import { IInstance } from "altinn-shared/types";
import { appApi } from "./AppApi";

export interface Prefill {
  [key: string]: any;
}

export interface InstanceOwner {
  partyId: string;
}

export interface Instantiation {
  instanceOwner: InstanceOwner;
  prefill: Prefill;
}

export const instancesApi = appApi.injectEndpoints({
  endpoints: (builder) => ({
    instantiateWithPrefill: builder.mutation<IInstance, Instantiation>({
      query: (instantiation => ({
        url: '/instances/create',
        method: 'POST',
        data: instantiation
      })),
    })
  }),
});

export const { endpoints, useInstantiateWithPrefillMutation } = instancesApi;
