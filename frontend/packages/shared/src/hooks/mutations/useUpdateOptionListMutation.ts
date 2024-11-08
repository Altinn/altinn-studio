import type { MutationMeta } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Option } from 'app-shared/types/Option';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { OptionsLists } from 'app-shared/types/api/OptionsLists';

export interface UpdateOptionListMutationArgs {
  optionListId: string;
  optionsList: Option[];
}

export const useUpdateOptionListMutation = (org: string, app: string, meta?: MutationMeta) => {
  const queryClient = useQueryClient();
  const { updateOptionList } = useServicesContext();

  return useMutation({
    mutationFn: ({ optionListId, optionsList }: UpdateOptionListMutationArgs) => {
      return updateOptionList(org, app, optionListId, optionsList);
    },
    onSuccess: (updatedOptionsList: OptionsLists) => {
      const convertedNewData = convertToMap(updatedOptionsList);
      const keys = [...convertedNewData.keys()];
      if (keys.length > 1) {
        const optionListId = keys[0];
        const convertedUpdatedOptionsList = convertedNewData.get(optionListId);

        const oldData: Map<string, Option[]> = queryClient.getQueryData([
          QueryKey.OptionLists,
          org,
          app,
        ]);
        oldData.set(optionListId, convertedUpdatedOptionsList);

        queryClient.setQueryData([QueryKey.OptionLists, org, app], (): Map<string, Option[]> => {
          return oldData;
        });
      }
    },
    meta,
  });
};

function convertToMap(result: OptionsLists): Map<string, Option[]> {
  const optionsMap = new Map<string, Option[]>();

  Object.entries(result).forEach(([key, value]) => {
    const mappedOptions = value.map((option) => ({
      ...option,
    }));

    optionsMap.set(key, mappedOptions);
  });

  return optionsMap;
}
