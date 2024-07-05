import { type UseMutateFunction, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type {
  LayoutSetConfig,
  LayoutSets,
  BpmnTaskType,
} from 'app-shared/types/api/LayoutSetsResponse';
import { useLocalStorage } from 'app-shared/hooks/useLocalStorage';
import type {
  AddLayoutSetResponse,
  LayoutSetsResponse,
} from 'app-shared/types/api/AddLayoutSetResponse';

export type AddLayoutSetMutationPayload = {
  layoutSetIdToUpdate: string;
  taskType?: BpmnTaskType;
  layoutSetConfig: LayoutSetConfig;
};
export type AddLayoutSetMutation = UseMutateFunction<
  AddLayoutSetResponse,
  Error,
  AddLayoutSetMutationPayload
>;

const isLayoutSets = (obj: LayoutSetsResponse): obj is LayoutSets => {
  if (obj === undefined || !(obj instanceof Object)) return false;
  return 'sets' in obj;
};

export const useAddLayoutSetMutation = (org: string, app: string) => {
  const { addLayoutSet } = useServicesContext();
  const queryClient = useQueryClient();
  const [_, setSelectedLayoutSet] = useLocalStorage<string>('layoutSet/' + app, null);

  return useMutation({
    mutationFn: ({ layoutSetIdToUpdate, taskType, layoutSetConfig }: AddLayoutSetMutationPayload) =>
      addLayoutSet(org, app, layoutSetIdToUpdate, { taskType, layoutSetConfig }).then(
        (layoutSets) => ({
          layoutSets,
          layoutSetConfig,
        }),
      ),
    onSuccess: ({ layoutSets, layoutSetConfig }) => {
      setSelectedLayoutSet(layoutSetConfig.id);
      // Need this check since endpoint might return 200 OK, but with info details
      // when process-editor renders the tasks and 'adds' them on first mount, when they already exists.
      if (isLayoutSets(layoutSets)) {
        queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSets);
      }
    },
  });
};
