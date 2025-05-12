import type {
  DefaultError,
  UseMutationResult,
  QueryKey as TanstackQueryKey,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';

export type UpdateOrgTextResourcesMutationArgs = {
  language: string;
  payload: KeyValuePairs<string>;
};

export const useUpdateOrgTextResourcesMutation = (
  org: string,
): UseMutationResult<
  ITextResourcesWithLanguage,
  DefaultError,
  UpdateOrgTextResourcesMutationArgs
> => {
  const client = useQueryClient();
  const { updateOrgTextResources } = useServicesContext();
  return useMutation<ITextResourcesWithLanguage, DefaultError, UpdateOrgTextResourcesMutationArgs>({
    mutationFn: ({ language, payload }: UpdateOrgTextResourcesMutationArgs) =>
      updateOrgTextResources(org, language, payload),
    onSuccess: (textResourcesWithLanguage) => {
      const queryKey: TanstackQueryKey = [
        QueryKey.OrgTextResources,
        org,
        textResourcesWithLanguage.language,
      ];
      client.setQueryData(queryKey, textResourcesWithLanguage);
    },
  });
};
