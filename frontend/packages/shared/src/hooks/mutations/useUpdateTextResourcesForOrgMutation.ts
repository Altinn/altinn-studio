import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { type ITextResourcesWithLanguage, type ITextResource } from '../../types/global';
import { QueryKey } from '../../types/QueryKey';

export const useUpdateTextResourcesForOrgMutation = (org: string, language: string) => {
  const q = useQueryClient();
  const { updateTextResourcesForOrg } = useServicesContext();
  return useMutation({
    mutationFn: async (payload: ITextResource[]) => {
      const textResourcesWithLanuage: ITextResourcesWithLanguage[] =
        await updateTextResourcesForOrg(org, language, payload);

      return textResourcesWithLanuage;
    },
    onSuccess: (textResourcesWithLanuage) =>
      q.setQueryData([QueryKey.TextResourcesForOrg, org], textResourcesWithLanuage),
  });
};
