import type { QueryClient } from '@tanstack/react-query';

import type { AppQueryClient } from 'src/core/queries/queryClient';

const clients = new WeakMap<AppQueryClient, QueryClient>();

export function registerQueryClient(handle: AppQueryClient, client: QueryClient) {
  clients.set(handle, client);
}

export function getQueryClient(handle: AppQueryClient): QueryClient {
  const client = clients.get(handle);
  if (!client) {
    throw new Error('Unknown app query client');
  }
  return client;
}
