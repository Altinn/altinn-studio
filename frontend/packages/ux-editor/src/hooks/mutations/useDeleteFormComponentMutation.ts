import { useFormLayoutsSelector } from '../useFormLayoutsSelector';
import { selectedLayoutWithNameSelector } from '../../selectors/formLayoutSelectors';
import { useMutation } from '@tanstack/react-query';
import { ComponentType } from '../../components';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { useDeleteAppAttachmentMetadataMutation } from './useDeleteAppAttachmentMetadataMutation';
import { removeComponent } from '../../utils/formLayoutUtils';

export const useDeleteFormComponentMutation = (org: string, app: string) =>  {
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const formLayoutsMutation = useFormLayoutMutation(org, app, layoutName);
  const deleteAppAttachmentMetadataMutation = useDeleteAppAttachmentMetadataMutation(org, app);
  return useMutation({
    mutationFn: async (id: string) => {
      const component = layout.components[id];
      const updatedLayout = removeComponent(layout, id);
      if (component?.type === ComponentType.FileUpload || component?.type === ComponentType.FileUploadWithTag) {
        await deleteAppAttachmentMetadataMutation.mutateAsync(id);
      }
      return formLayoutsMutation.mutateAsync(updatedLayout);
    }
  });
};
