import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportCodeListResponse } from 'app-shared/types/api/ImportCodeListResponse';
import type {
  ITextResource,
  ITextResources,
  ITextResourcesWithLanguage,
} from 'app-shared/types/global';

export const useImportCodeListFromOrgToAppMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { importCodeListFromOrgToApp } = useServicesContext();

  return useMutation({
    mutationFn: async (codeListId: string): Promise<ImportCodeListResponse> => {
      return await importCodeListFromOrgToApp(org, app, codeListId);
    },
    onSuccess: ({ optionLists, textResources }: ImportCodeListResponse) => {
      const updatedTextResources: ITextResources =
        convertTextResourceResponseToCacheFormat(textResources);
      queryClient.setQueryData([QueryKey.TextResources, org, app], updatedTextResources);
      queryClient.setQueryData([QueryKey.OptionLists, org, app], optionLists);

      return Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.OptionLists, org] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.OptionList, org] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.AvailableOrgResources, org] }),
      ]);
    },
  });
};

export function convertTextResourceResponseToCacheFormat(
  texts: Record<string, ITextResourcesWithLanguage> | undefined,
): ITextResources | null {
  if (!texts) return null;

  const entries = Object.entries(texts).map(
    ([languageCode, { resources }]): [string, ITextResource[]] => [languageCode, resources],
  );

  return Object.fromEntries(entries);
}
