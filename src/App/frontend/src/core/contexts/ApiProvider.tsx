import React from 'react';
import type { PropsWithChildren } from 'react';

import { backendValidationApi } from 'src/core/api-client/backendValidation.api';
import { instanceApi } from 'src/core/api-client/instance.api';
import { partyApi } from 'src/core/api-client/party.api';
import { textResourcesApi } from 'src/core/api-client/textResources.api';
import { createContext } from 'src/core/contexts/context';
import type { ApiClients } from 'src/core/api-client/ApiClients';

interface ApiProviderProps extends PropsWithChildren {
  apis?: Partial<ApiClients>;
}

const defaultApis: ApiClients = {
  backendValidationApi,
  partyApi,
  instanceApi,
  textResourcesApi,
};

const { Provider, useCtx } = createContext<ApiClients>({
  name: 'ApiProvider',
  required: false,
  default: defaultApis,
});

export function ApiProvider({ children, apis }: ApiProviderProps) {
  return <Provider value={{ ...defaultApis, ...apis }}>{children}</Provider>;
}

export const usePartyApi = () => useCtx().partyApi;
export const useTextResourcesApi = () => useCtx().textResourcesApi;
export const useInstanceApi = () => useCtx().instanceApi;
export const useBackendValidationApi = () => useCtx().backendValidationApi;
