import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { type ITextResource } from 'app-shared/types/global';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUpdateTextResourcesForOrgMutation = (org: string, language: string) => {
  const q = useQueryClient();
  const { updateTextResourcesForOrg } = useServicesContext();
  return useMutation({
    mutationFn: (payload: ITextResource[]) => updateTextResourcesForOrg(org, language, payload),
    onSuccess: () =>
      Promise.all([q.invalidateQueries({ queryKey: [QueryKey.TextResourcesForOrg] })]),
  });
};
