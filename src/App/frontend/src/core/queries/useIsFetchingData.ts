import { useIsFetching } from '@tanstack/react-query';
export function useIsFetchingData() {
  return useIsFetching() > 0;
}
