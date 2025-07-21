import type { QueryClientConfig } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';

export const queryClientConfigMock: QueryClientConfig = {
  defaultOptions: {
    mutations: { retry: false },
    queries: { retry: false, staleTime: Infinity },
  },
};

export const createQueryClientMock = () => new QueryClient(queryClientConfigMock);

export const queryClientMock = createQueryClientMock(); // Todo: Remove this when all usages are replaced with createQueryClientMock: https://github.com/Altinn/altinn-studio/issues/15513
