import type { QueryClient } from '@tanstack/react-query';

import type { AppQueryClient } from 'src/core/queries/queryClient';

const handles = new WeakMap<QueryClient, AppQueryClient>();

const clients = new WeakMap<AppQueryClient, QueryClient>();

export function registerQueryClient(handle: AppQueryClient, client: QueryClient) {
  clients.set(handle, client);
  handles.set(client, handle);
}

export function getQueryClient(handle: AppQueryClient): QueryClient {
  const client = clients.get(handle);
  if (!client) {
    throw new Error('Unknown app query client');
  }
  return client;
}

export function getAppQueryClient(client: QueryClient): AppQueryClient {
  const handle = handles.get(client);
  if (!handle) {
    throw new Error('Unknown app query client');
  }
  return handle;
}
