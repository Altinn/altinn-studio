import type { QueryClient } from '@tanstack/react-query';

export type AppQueryClient = QueryClient;

export interface BaseQueryResult {
  error: Error | null;
  isLoading: boolean;
}
