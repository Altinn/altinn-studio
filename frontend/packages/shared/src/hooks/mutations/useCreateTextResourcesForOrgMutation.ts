import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';

export const useCreateTextResourcesForOrgMutation = (org: string, language: string) => {
  const q = useQueryClient();
  const { createTextResourcesForOrg } = useServicesContext();
  return useMutation({
    mutationFn: () => createTextResourcesForOrg(org, language),
    onSuccess: () => q.invalidateQueries({ queryKey: [QueryKey.TextResourcesForOrg] }),
  });
};
