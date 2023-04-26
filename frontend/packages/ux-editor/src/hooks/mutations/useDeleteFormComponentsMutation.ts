import { IInternalLayout } from '../../types/global';
import { useFormLayoutsSelector } from '../useFormLayoutsSelector';
import { selectedLayoutWithNameSelector } from '../../selectors/formLayoutSelectors';
import { useMutation } from '@tanstack/react-query';
import { ComponentType } from '../../components';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { useDeleteAppAttachmentMetadataMutation } from './useDeleteAppAttachmentMetadataMutation';
import { removeComponent } from '../../utils/formLayoutUtils';

export const useDeleteFormComponentsMutation = (org: string, app: string) =>  {
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const formLayoutsMutation = useFormLayoutMutation(org, app, layoutName);
  const deleteAppAttachmentMetadataMutation = useDeleteAppAttachmentMetadataMutation(org, app);
  return useMutation({
    mutationFn: async (components: string[]) => {

      let updatedLayout: IInternalLayout = layout;

      for (const id of components) {
        const component = layout.components[id];
        updatedLayout = removeComponent(updatedLayout, id);
        if (component?.type === ComponentType.FileUpload || component?.type === ComponentType.FileUploadWithTag) {
          await deleteAppAttachmentMetadataMutation.mutateAsync(id);
        }
      }

      return formLayoutsMutation.mutateAsync(updatedLayout);
    }
  });
};
