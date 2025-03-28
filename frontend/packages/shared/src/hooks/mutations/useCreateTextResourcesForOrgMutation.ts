import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import { type ITextResourcesWithLanguage } from '../../types/global';

export const useCreateTextResourcesForOrgMutation = (
  org: string,
  language: string,
): UseMutationResult<ITextResourcesWithLanguage> => {
  const q = useQueryClient();
  const { createTextResourcesForOrg } = useServicesContext();
  return useMutation<ITextResourcesWithLanguage>({
    mutationFn: () => createTextResourcesForOrg(org, language),
    onSuccess: (textResourcesWithLanguage) =>
      q.setQueryData([QueryKey.TextResourcesForOrg, org], textResourcesWithLanguage),
  });
};
