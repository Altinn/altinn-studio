import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useCreateTextResourcesForOrg = (org: string, language: string) => {
  const q = useQueryClient();
  const { createTextResourcesForOrg } = useServicesContext();
  return useMutation({
    mutationFn: () => createTextResourcesForOrg(org, language),
    onSuccess: () =>
      Promise.all([q.invalidateQueries({ queryKey: [QueryKey.TextResourcesForOrg] })]),
  });
};
