// src/ApiClientContext.tsx
import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import { Api } from 'nextsrc/nextpoc/app/api';

const api = new Api({
  baseUrl: origin, //appPath,
  // You can pass axios overrides or custom fetch here if desired
});

// Define the shape of the context
interface ApiClientContextValue {
  apiClient: typeof api;
}

// Create the context with a default value (helpful for testing)
const ApiClientContext = createContext<ApiClientContextValue>({
  apiClient: api,
});

// Create a provider component
interface ApiClientProviderProps {
  children: ReactNode;
}

export function ApiClientProvider({ children }: ApiClientProviderProps) {
  return <ApiClientContext.Provider value={{ apiClient: api }}>{children}</ApiClientContext.Provider>;
}

// Custom hook to use the client
export function useApiClient() {
  const context = useContext(ApiClientContext);
  if (!context) {
    throw new Error('useApiClient must be used within an ApiClientProvider');
  }
  return context.apiClient;
}
