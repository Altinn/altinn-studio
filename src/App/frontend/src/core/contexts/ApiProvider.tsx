import React from 'react';
import type { PropsWithChildren } from 'react';

import { type PartyApi, partyApi } from 'src/core/api-client/party.api';
import { type TextResourcesApi, textResourcesApi } from 'src/core/api-client/textResources.api';
import { createContext } from 'src/core/contexts/context';

export interface ApiClients {
  partyApi: PartyApi;
  textResourcesApi: TextResourcesApi;
}

interface ApiProviderProps extends PropsWithChildren {
  apis: ApiClients;
}

const { Provider, useCtx } = createContext<ApiClients>({
  name: 'ApiProvider',
  required: false,
  default: { partyApi, textResourcesApi },
});

export function ApiProvider({ children, apis }: ApiProviderProps) {
  return <Provider value={apis}>{children}</Provider>;
}

export const usePartyApi = () => useCtx().partyApi;
export const useTextResourcesApi = () => useCtx().textResourcesApi;
