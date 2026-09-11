import {
  skipToken as tanStackSkipToken,
  useIsMutating as useTanStackIsMutating,
  useMutation as useTanStackMutation,
  useQuery as useTanStackQuery,
  useQueryClient as useTanStackQueryClient,
} from '@tanstack/react-query';
import type {
  QueryClient as TanStackQueryClient,
  UseQueryOptions as TanStackUseQueryOptions,
} from '@tanstack/react-query';

export const skipToken: typeof tanStackSkipToken = tanStackSkipToken;
export const useIsMutating: typeof useTanStackIsMutating = useTanStackIsMutating;
export const useMutation: typeof useTanStackMutation = useTanStackMutation;
export const useQuery: typeof useTanStackQuery = useTanStackQuery;
export const useQueryClient: typeof useTanStackQueryClient = useTanStackQueryClient;

export type QueryClient = TanStackQueryClient;
export type UseQueryOptions<TQueryFnData = unknown, TError = Error, TData = TQueryFnData> = TanStackUseQueryOptions<
  TQueryFnData,
  TError,
  TData
>;
