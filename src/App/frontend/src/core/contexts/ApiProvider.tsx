import React from 'react';
import type { PropsWithChildren } from 'react';

import { type PartyApi, partyApi } from 'src/core/api-client/party.api';
import { createContext } from 'src/core/contexts/context';

export interface ApiClients {
  partyApi: PartyApi;
}

interface ApiProviderProps extends PropsWithChildren {
  apis: ApiClients;
}

const { Provider, useCtx } = createContext<ApiClients>({
  name: 'ApiProvider',
  required: false,
  default: { partyApi },
});

export function ApiProvider({ children, apis }: ApiProviderProps) {
  return <Provider value={apis}>{children}</Provider>;
}

export const usePartyApi = () => useCtx().partyApi;
