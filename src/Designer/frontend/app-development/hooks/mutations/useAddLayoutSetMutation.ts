import { type UseMutateFunction, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import type { UiFolderLayoutSetModel } from 'app-shared/types/api/dto/UiFolderLayoutSetModel';
import type { LayoutSetPayload } from 'app-shared/types/api/LayoutSetPayload';

export type AddLayoutSetMutationPayload = {
  layoutSetIdToUpdate: string;
} & LayoutSetPayload;

export type AddLayoutSetMutation = UseMutateFunction<
  (LayoutSetModel | UiFolderLayoutSetModel)[],
  Error,
  AddLayoutSetMutationPayload
>;

export const useAddLayoutSetMutation = (org: string, app: string) => {
  const { addLayoutSet } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ layoutSetIdToUpdate, taskType, layoutSetConfig }: AddLayoutSetMutationPayload) =>
      addLayoutSet(org, app, layoutSetIdToUpdate, { taskType, layoutSetConfig }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSetsExtended, org, app] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
    },
  });
};
