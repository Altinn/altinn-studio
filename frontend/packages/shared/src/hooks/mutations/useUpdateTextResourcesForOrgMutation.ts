import type { DefaultError, UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';

export type UpdateTextResourcesForOrgMutationArgs = {
  language: string;
  payload: KeyValuePairs;
};

export const useUpdateTextResourcesForOrgMutation = (
  org: string,
): UseMutationResult<
  ITextResourcesWithLanguage,
  DefaultError,
  UpdateTextResourcesForOrgMutationArgs
> => {
  const client = useQueryClient();
  const { updateTextResourcesForOrg } = useServicesContext();
  return useMutation<
    ITextResourcesWithLanguage,
    DefaultError,
    UpdateTextResourcesForOrgMutationArgs
  >({
    mutationFn: ({ language, payload }: UpdateTextResourcesForOrgMutationArgs) =>
      updateTextResourcesForOrg(org, language, payload),
    onSuccess: (textResourcesWithLanguage) =>
      client.setQueryData([QueryKey.TextResourcesForOrg, org], textResourcesWithLanguage),
  });
};
