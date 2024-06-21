import type { IInternalLayout } from '../../types/global';
import { useSelectedFormLayoutWithName } from '../';
import { useMutation } from '@tanstack/react-query';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { ObjectUtils } from '@studio/pure-functions';
import type { ComponentIdsChange } from 'app-shared/types/api/FormLayoutRequest';

export const useDeleteFormContainerMutation = (org: string, app: string, layoutSetName: string) => {
  const { layout, layoutName } = useSelectedFormLayoutWithName();
  const formLayoutsMutation = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  return useMutation({
    mutationFn: (id: string) => {
      const updatedLayout: IInternalLayout = ObjectUtils.deepCopy(layout);
      const componentIdsChange: ComponentIdsChange = [];

      // Delete child components:
      // Todo: Consider if this should rather be done in the backend
      for (const componentId of layout.order[id]) {
        if (Object.keys(layout.components).indexOf(componentId) > -1) {
          delete updatedLayout.components[componentId];
          delete updatedLayout.containers[componentId];
          delete updatedLayout.order[componentId];
          componentIdsChange.push({ oldComponentId: componentId, newComponentId: undefined });
          updatedLayout.order[id].splice(updatedLayout.order[id].indexOf(componentId), 1);
        }
      }

      // Find parent container ID:
      let parentContainerId = Object.keys(layout.order)[0];
      Object.keys(layout.order).forEach((cId) => {
        if (layout.order[cId].find((containerId) => containerId === id)) {
          parentContainerId = cId;
        }
      });

      // Delete container:
      delete updatedLayout.containers[id];
      delete updatedLayout.order[id];
      if (parentContainerId) {
        updatedLayout.order[parentContainerId].splice(
          updatedLayout.order[parentContainerId].indexOf(id),
          1,
        );
        componentIdsChange.push({
          oldComponentId: id,
          newComponentId: undefined,
        });
      }

      return formLayoutsMutation.mutateAsync({ internalLayout: updatedLayout, componentIdsChange });
    },
  });
};
