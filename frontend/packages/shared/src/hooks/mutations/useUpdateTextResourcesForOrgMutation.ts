import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { type ITextResource } from '../../types/global';
import { QueryKey } from '../../types/QueryKey';

export const useUpdateTextResourcesForOrgMutation = (org: string, language: string) => {
  const q = useQueryClient();
  const { updateTextResourcesForOrg } = useServicesContext();
  return useMutation({
    mutationFn: (payload: ITextResource[]) => updateTextResourcesForOrg(org, language, payload),
    onSuccess: () => q.invalidateQueries({ queryKey: [QueryKey.TextResourcesForOrg] }),
  });
};
