import React from 'react';
import type { PropsWithChildren } from 'react';

import { type InstanceApi, instanceApi } from 'src/core/api-client/instance.api';
import { type PartyApi, partyApi } from 'src/core/api-client/party.api';
import { type TextResourcesApi, textResourcesApi } from 'src/core/api-client/textResources.api';
import { createContext } from 'src/core/contexts/context';

export interface ApiClients {
  partyApi: PartyApi;
  instanceApi: InstanceApi;
  textResourcesApi: TextResourcesApi;
}

interface ApiProviderProps extends PropsWithChildren {
  apis?: Partial<ApiClients>;
}

const defaultApis: ApiClients = {
  partyApi,
  instanceApi,
  textResourcesApi,
};

const { Provider, useCtx } = createContext<ApiClients>({
  name: 'ApiProvider',
  required: false,
  default: { partyApi, instanceApi, textResourcesApi },
});

export function ApiProvider({ children, apis }: ApiProviderProps) {
  return <Provider value={{ ...defaultApis, ...apis }}>{children}</Provider>;
}

export const usePartyApi = () => useCtx().partyApi;
export const useTextResourcesApi = () => useCtx().textResourcesApi;
export const useInstanceApi = () => useCtx().instanceApi;
