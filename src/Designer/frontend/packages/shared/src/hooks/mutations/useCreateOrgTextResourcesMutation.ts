import type {
  DefaultError,
  QueryKey as TanstackQueryKey,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import { type ITextResourcesWithLanguage } from '../../types/global';

export const useCreateOrgTextResourcesMutation = (
  orgName: string,
): UseMutationResult<ITextResourcesWithLanguage, DefaultError, string> => {
  const client = useQueryClient();
  const { createOrgTextResources } = useServicesContext();

  return useMutation<ITextResourcesWithLanguage, DefaultError, string>({
    mutationFn: (language: string) => {
      const payload: ITextResourcesWithLanguage = createPayloadWithEmptyList(language);
      return createOrgTextResources(orgName, language, payload);
    },
    onSuccess: (textResourcesWithLanguage: ITextResourcesWithLanguage) => {
      const queryKey: TanstackQueryKey = [
        QueryKey.OrgTextResources,
        orgName,
        textResourcesWithLanguage.language,
      ];
      client.setQueryData(queryKey, textResourcesWithLanguage);
    },
  });
};

function createPayloadWithEmptyList(language: string): ITextResourcesWithLanguage {
  return {
    language,
    resources: [],
  };
}
