import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';

export const useDeleteLayoutSetMutation = (org: string, app: string) => {
  const { deleteLayoutSet } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ layoutSetIdToUpdate }: { layoutSetIdToUpdate: string }) =>
      deleteLayoutSet(org, app, layoutSetIdToUpdate),
    onSuccess: (_data, { layoutSetIdToUpdate }) => {
      queryClient.setQueryData<LayoutSets>(
        [QueryKey.LayoutSets, org, app],
        removeLayoutSet(layoutSetIdToUpdate),
      );
      queryClient.setQueryData<LayoutSetModel[]>(
        [QueryKey.LayoutSetsExtended, org, app],
        removeLayoutSetModel(layoutSetIdToUpdate),
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] });
    },
  });
};

const removeLayoutSet = (layoutSetId: string) => (old: LayoutSets | undefined) =>
  old && { ...old, sets: old.sets.filter((set) => set.id !== layoutSetId) };

const removeLayoutSetModel = (layoutSetId: string) => (old: LayoutSetModel[] | undefined) =>
  old?.filter((set) => set.id !== layoutSetId);
