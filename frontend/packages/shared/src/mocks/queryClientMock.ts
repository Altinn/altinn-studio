import { QueryClient, QueryClientConfig } from '@tanstack/react-query';

export const queryClientConfigMock: QueryClientConfig = {
  defaultOptions: {
    mutations: { retry: false },
    queries: { retry: false, staleTime: Infinity },
  },
};

export const createQueryClientMock = () => new QueryClient(queryClientConfigMock);

export const queryClientMock = createQueryClientMock();
