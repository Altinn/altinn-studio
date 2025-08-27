import { useSelectedFormLayoutWithName } from '../useFormLayoutsSelector';
import { useMutation } from '@tanstack/react-query';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { useDeleteAppAttachmentMetadataMutation } from './useDeleteAppAttachmentMetadataMutation';
import { removeComponent } from '../../utils/formLayoutUtils';

export const useDeleteFormComponentMutation = (org: string, app: string, layoutSetName: string) => {
  const { layout, layoutName } = useSelectedFormLayoutWithName();
  const formLayoutsMutation = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  const deleteAppAttachmentMetadataMutation = useDeleteAppAttachmentMetadataMutation(org, app);
  return useMutation({
    mutationFn: async (id: string) => {
      const component = layout.components[id];
      const updatedLayout = removeComponent(layout, id);
      if (
        component?.type === ComponentTypeV3.FileUpload ||
        component?.type === ComponentTypeV3.FileUploadWithTag
      ) {
        await deleteAppAttachmentMetadataMutation.mutateAsync(id);
      }
      return formLayoutsMutation.mutateAsync(updatedLayout);
    },
  });
};
