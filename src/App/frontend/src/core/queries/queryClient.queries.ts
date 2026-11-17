import { QueryClient } from '@tanstack/react-query';

const queryClient = Symbol('AppQueryClient');

/** Opaque cache handle; the private symbol keeps TanStack types out of its public interface. */
export interface AppQueryClient {
  readonly [queryClient]: unknown;
}

export function createQueryClientHandle(client: QueryClient): AppQueryClient {
  return { [queryClient]: client };
}

export function getQueryClient(handle: AppQueryClient): QueryClient {
  const client = handle[queryClient];
  if (!(client instanceof QueryClient)) {
    throw new Error('Unknown app query client');
  }
  return client;
}
