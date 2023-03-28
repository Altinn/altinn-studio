import { IInternalLayout } from '../../types/global';
import { useFormLayoutsSelector } from '../useFormLayoutsSelector';
import { selectedLayoutWithNameSelector } from '../../selectors/formLayoutSelectors';
import { useMutation } from '@tanstack/react-query';
import { ComponentType } from '../../components';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { deepCopy } from 'app-shared/pure';
import { useDeleteAppAttachmentMetadataMutation } from './useDeleteAppAttachmentMetadataMutation';

export const useDeleteFormComponentsMutation = (org: string, app: string) =>  {
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const formLayoutsMutation = useFormLayoutMutation(org, app, layoutName);
  const deleteAppAttachmentMetadataMutation = useDeleteAppAttachmentMetadataMutation(org, app);
  return useMutation({
    mutationFn: async (components: string[]) => {

      const updatedLayout: IInternalLayout = deepCopy(layout);

      for (const id of components) {
        const component = layout.components[id];
        let containerId = Object.keys(layout.order)[0];
        Object.keys(layout.order).forEach((cId) => {
          if (layout.order[cId].find((componentId) => componentId === id)) {
            containerId = cId;
          }
        });

        delete updatedLayout.components[id];
        updatedLayout.order[containerId].splice(layout.order[containerId].indexOf(id), 1);

        if (component?.type === ComponentType.FileUpload) {
          await deleteAppAttachmentMetadataMutation.mutateAsync(id);
        }
      }

      return formLayoutsMutation.mutateAsync(updatedLayout);
    }
  });
};
