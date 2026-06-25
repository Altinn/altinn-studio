import { type UseMutateFunction, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { LayoutSetPayload } from 'app-shared/types/api/LayoutSetPayload';

export type AddLayoutSetMutationPayload = LayoutSetPayload;

export type AddLayoutSetMutation = UseMutateFunction<
  void,
  Error,
  AddLayoutSetMutationPayload
>;

export const useAddLayoutSetMutation = (org: string, app: string) => {
  const { addLayoutSet } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskType, layoutSetConfig }: AddLayoutSetMutationPayload) =>
      addLayoutSet(org, app, { taskType, layoutSetConfig }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSetsExtended, org, app] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
    },
  });
};
