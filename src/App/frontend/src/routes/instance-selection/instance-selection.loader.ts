import type { QueryClient } from '@tanstack/react-query';

import { fetchPartiesAllowedToInstantiate } from 'src/queries/queries';

export function instanceSelectionLoader(queryClient: QueryClient) {
  return async function loader() {
    await queryClient.ensureQueryData({
      queryKey: ['parties', 'allowedToInstantiate'],
      queryFn: fetchPartiesAllowedToInstantiate,
    });
    return null;
  };
}
