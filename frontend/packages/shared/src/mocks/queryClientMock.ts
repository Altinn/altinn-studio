import { QueryClient } from '@tanstack/react-query';

export const queryClientMock = new QueryClient({
  logger: {
    log: () => {},
    warn: () => {},
    error: () => {},
  },
  defaultOptions: {
    queries: { staleTime: Infinity },
  },
});
