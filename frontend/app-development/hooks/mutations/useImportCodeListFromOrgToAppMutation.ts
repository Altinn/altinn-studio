import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { OptionList } from 'app-shared/types/OptionList';

export const useImportCodeListFromOrgToAppMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { importCodeListFromOrgToApp } = useServicesContext();

  return useMutation({
    mutationFn: async (codeListId: string) => {
      const optionList: OptionList = await importCodeListFromOrgToApp(org, app, codeListId);
      await queryClient.invalidateQueries({ queryKey: [QueryKey.TextResources, org, app] });
      return optionList;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.OptionLists, org] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.OptionList, org] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.AvailableOrgResources, org] }),
      ]),
  });
};
