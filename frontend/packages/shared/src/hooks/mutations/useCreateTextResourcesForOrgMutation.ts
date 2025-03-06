import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import { type ITextResourcesWithLanguage } from '../../types/global';

export const useCreateTextResourcesForOrgMutation = (org: string, language: string) => {
  const q = useQueryClient();
  const { createTextResourcesForOrg } = useServicesContext();
  return useMutation({
    mutationFn: async () => {
      const textResourcesWithLanguage: ITextResourcesWithLanguage[] =
        await createTextResourcesForOrg(org, language);

      return textResourcesWithLanguage;
    },
    onSuccess: (textResourcesWithLanguage) =>
      q.setQueryData([QueryKey.TextResourcesForOrg, org], textResourcesWithLanguage),
  });
};
