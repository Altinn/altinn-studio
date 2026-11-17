import { useCallback } from 'react';

import { useIsFetching, useQueryClient } from '@tanstack/react-query';

export function useIsFetchingData() {
  return useIsFetching() > 0;
}

export function useIsFetchingDataNow() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.isFetching() > 0, [queryClient]);
}
