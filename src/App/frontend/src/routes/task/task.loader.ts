import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { fetchFreshInstanceData } from 'src/core/queries/instance';

export function taskLoader(queryClient: QueryClient) {
  return async function loader({ params }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid } = params;

    // Always fetch fresh instance data when navigating to a task.
    // This ensures the cached process state matches the task in the URL,
    // preventing a flash of the wrong-task error during transitions
    // (e.g., when Feedback polling detects an external process change).
    if (instanceOwnerPartyId && instanceGuid) {
      await fetchFreshInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid });
    }

    return null;
  };
}
