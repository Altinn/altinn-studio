import React from 'react';
import type { PropsWithChildren } from 'react';

import { apiClients } from 'src/core/api-client';
import { createContext } from 'src/core/contexts/context';
import type { ApiClients } from 'src/core/api-client/ApiClients';

interface ApiProviderProps extends PropsWithChildren {
  apis?: Partial<ApiClients>;
}

const { Provider, useCtx } = createContext<ApiClients>({ name: 'ApiProvider', required: false, default: apiClients });

export function ApiProvider({ children, apis }: ApiProviderProps) {
  return <Provider value={{ ...apiClients, ...apis }}>{children}</Provider>;
}

export const useProcessApi = () => useCtx().processApi;
export const useAttachmentsApi = () => useCtx().attachmentsApi;
export const useActionsApi = () => useCtx().actionsApi;
export const useSubformApi = () => useCtx().subformApi;
export const useFormDataApi = () => useCtx().formDataApi;
export const useResourcesApi = () => useCtx().resourcesApi;
export const useAuthApi = () => useCtx().authApi;
export const useOptionsApi = () => useCtx().optionsApi;
export const useDataListsApi = () => useCtx().dataListsApi;
export const usePaymentApi = () => useCtx().paymentApi;
export const useFormBootstrapApi = () => useCtx().formBootstrapApi;
export const useExternalApiClient = () => useCtx().externalApi;
export const useBackendValidationApi = () => useCtx().backendValidationApi;
export const useInstanceApi = () => useCtx().instanceApi;
export const usePartyApi = () => useCtx().partyApi;
export const useTextResourcesApi = () => useCtx().textResourcesApi;
export const useSigningApi = () => useCtx().signingApi;
export const useLookupApi = () => useCtx().lookupApi;
