import { QueryClient, QueryClientConfig } from '@tanstack/react-query';

export const queryClientConfigMock: QueryClientConfig = {
  logger: {
    log: () => {},
    warn: () => {},
    error: () => {},
  },
  defaultOptions: {
    queries: { staleTime: Infinity },
  },
};

export const createQueryClientMock = () => new QueryClient(queryClientConfigMock);

export const queryClientMock = createQueryClientMock();
