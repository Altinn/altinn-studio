import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { ITextResource } from '../../types/global';
import { QueryKey } from '../../types/QueryKey';

export type UpdateTextResourcesForOrgMutationArgs = {
  language: string;
  payload: ITextResource[];
};

export const useUpdateTextResourcesForOrgMutation = (org: string) => {
  const client = useQueryClient();
  const { updateTextResourcesForOrg } = useServicesContext();
  return useMutation({
    mutationFn: ({ language, payload }: UpdateTextResourcesForOrgMutationArgs) =>
      updateTextResourcesForOrg(org, language, payload),
    onSuccess: (textResourcesWithLanguage) =>
      client.setQueryData([QueryKey.TextResourcesForOrg, org], textResourcesWithLanguage),
  });
};
