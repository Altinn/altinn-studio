import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import { type ITextResourcesWithLanguage } from '../../types/global';

export const useCreateTextResourcesForOrgMutation = (org: string, language: string) => {
  const q = useQueryClient();
  const { createTextResourcesForOrg } = useServicesContext();
  return useMutation({
    mutationFn: async () => {
      const textResourcesWithLanuage: ITextResourcesWithLanguage[] =
        await createTextResourcesForOrg(org, language);

      return textResourcesWithLanuage;
    },
    onSuccess: (textResourcesWithLanuage) =>
      q.setQueryData([QueryKey.TextResourcesForOrg, org], textResourcesWithLanuage),
  });
};
