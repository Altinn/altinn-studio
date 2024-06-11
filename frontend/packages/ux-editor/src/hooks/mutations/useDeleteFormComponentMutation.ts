import { useSelectedFormLayoutWithName } from '../';
import { useMutation } from '@tanstack/react-query';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { useDeleteAppAttachmentMetadataMutation } from './useDeleteAppAttachmentMetadataMutation';
import { removeComponent } from '../../utils/formLayoutUtils';
import type { ComponentIdsChange } from 'app-shared/types/api/FormLayoutRequest';

export const useDeleteFormComponentMutation = (org: string, app: string, layoutSetName: string) => {
  const { layout, layoutName } = useSelectedFormLayoutWithName();
  const formLayoutsMutation = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  const deleteAppAttachmentMetadataMutation = useDeleteAppAttachmentMetadataMutation(org, app);
  return useMutation({
    mutationFn: async (id: string) => {
      const component = layout.components[id];
      const updatedLayout = removeComponent(layout, id);
      if (
        component?.type === ComponentType.FileUpload ||
        component?.type === ComponentType.FileUploadWithTag
      ) {
        await deleteAppAttachmentMetadataMutation.mutateAsync(id);
      }

      const componentIdsChange: ComponentIdsChange = [
        {
          oldComponentId: id,
          newComponentId: undefined,
        },
      ];

      return formLayoutsMutation.mutateAsync({ internalLayout: updatedLayout, componentIdsChange });
    },
  });
};
