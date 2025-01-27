import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';

export const useCreateOrgLevelCodeListMutation = () => {
  const q = useQueryClient();
  const { createOrgLevelCodeList } = useServicesContext();
  return useMutation({
    mutationFn: (codeListItem: OptionListsResponse) => createOrgLevelCodeList(codeListItem),
    onSuccess: () => Promise.all([q.invalidateQueries({ queryKey: [QueryKey.OrgLevelCodeLists] })]),
  });
};
