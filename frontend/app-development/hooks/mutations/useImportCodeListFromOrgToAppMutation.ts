import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportCodeListResponse } from 'app-shared/types/api/ImportCodeListResponse';
import type { ITextResources, ITextResourcesWithLanguage } from 'app-shared/types/global';

export const useImportCodeListFromOrgToAppMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { importCodeListFromOrgToApp } = useServicesContext();

  return useMutation({
    mutationFn: async (codeListId: string): Promise<ImportCodeListResponse> => {
      return await importCodeListFromOrgToApp(org, app, codeListId);
    },
    onSuccess: ({ optionList, textResources }: ImportCodeListResponse) => {
      const updatedTextResources: ITextResources = extractTexts(textResources);
      queryClient.setQueryData([QueryKey.TextResources, org, app], updatedTextResources);
      queryClient.setQueryData([QueryKey.OptionLists, org, app], optionList);

      return Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.OptionLists, org] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.OptionList, org] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.AvailableOrgResources, org] }),
      ]);
    },
  });
};

export function extractTexts(
  texts: Record<string, ITextResourcesWithLanguage> | undefined,
): ITextResources | null {
  if (!texts) return null;
  const updatedTextResources: ITextResources = {};

  Object.keys(texts).forEach((language: string): void => {
    updatedTextResources[language] = texts[language].resources;
  });

  return updatedTextResources;
}
