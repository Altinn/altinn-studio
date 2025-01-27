import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useEditOrgCodeListMutation = () => {
  const q = useQueryClient();
  const { editOrgLevelCodeList } = useServicesContext();
  return useMutation({
    mutationFn: (codeListItem: OptionListsResponse) => editOrgLevelCodeList(codeListItem),
    onSuccess: () => Promise.all([q.invalidateQueries({ queryKey: [QueryKey.OrgLevelCodeLists] })]),
  });
};
