import { useQueryClient } from '@tanstack/react-query';
import { useInvalidCacheEvent } from 'app-shared/events/invalidate-cache';

export const useInvalidator = () => {
  const queryClient = useQueryClient();
  return useInvalidCacheEvent((queryKey) => queryClient.invalidateQueries({ queryKey }));
};
