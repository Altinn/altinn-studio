import React from 'react';
import type { PropsWithChildren } from 'react';

import { type BackendValidationApi, backendValidationApi } from 'src/core/api-client/backendValidation.api';
import { type InstanceApi, instanceApi } from 'src/core/api-client/instance.api';
import { type OptionsApi, optionsApi } from 'src/core/api-client/options.api';
import { type PartyApi, partyApi } from 'src/core/api-client/party.api';
import { type TextResourcesApi, textResourcesApi } from 'src/core/api-client/textResources.api';
import { createContext } from 'src/core/contexts/context';

export interface ApiClients {
  backendValidationApi: BackendValidationApi;
  partyApi: PartyApi;
  instanceApi: InstanceApi;
  textResourcesApi: TextResourcesApi;
  optionsApi: OptionsApi;
}

interface ApiProviderProps extends PropsWithChildren {
  apis?: Partial<ApiClients>;
}

const defaultApis: ApiClients = {
  backendValidationApi,
  partyApi,
  instanceApi,
  textResourcesApi,
  optionsApi,
};

const { Provider, useCtx } = createContext<ApiClients>({
  name: 'ApiProvider',
  required: false,
  default: { backendValidationApi, partyApi, instanceApi, textResourcesApi, optionsApi },
});

export function ApiProvider({ children, apis }: ApiProviderProps) {
  return <Provider value={{ ...defaultApis, ...apis }}>{children}</Provider>;
}

export const usePartyApi = () => useCtx().partyApi;
export const useTextResourcesApi = () => useCtx().textResourcesApi;
export const useInstanceApi = () => useCtx().instanceApi;
export const useBackendValidationApi = () => useCtx().backendValidationApi;
export const useOptionsApi = () => useCtx().optionsApi;
