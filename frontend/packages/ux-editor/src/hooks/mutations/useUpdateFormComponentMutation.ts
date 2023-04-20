import { IFormComponent, IFormFileUploaderComponent, IInternalLayout } from '../../types/global';
import { useMutation } from '@tanstack/react-query';
import { ComponentType } from '../../components';
import { useAddAppAttachmentMetadataMutation } from './useAddAppAttachmentMetadataMutation';
import { useDeleteAppAttachmentMetadataMutation } from './useDeleteAppAttachmentMetadataMutation';
import { useUpdateAppAttachmentMetadataMutation } from './useUpdateAppAttachmentMetadataMutation';
import { useFormLayoutsSelector } from '../useFormLayoutsSelector';
import { selectedLayoutWithNameSelector } from '../../selectors/formLayoutSelectors';
import { deepCopy } from 'app-shared/pure';
import { useFormLayoutMutation } from './useFormLayoutMutation';

export interface UpdateFormComponentArgs {
  updatedComponent: IFormComponent;
  id: string;
}

export const useUpdateFormComponentMutation = (org: string, app: string) => {
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const formLayoutMutation = useFormLayoutMutation(org, app, layoutName);
  const addAppAttachmentMetadataMutation = useAddAppAttachmentMetadataMutation(org, app);
  const deleteAppAttachmentMetadataMutation = useDeleteAppAttachmentMetadataMutation(org, app);
  const updateAppAttachmentMetadata = useUpdateAppAttachmentMetadataMutation(org, app);
  return useMutation({
    mutationFn: ({ updatedComponent, id }: UpdateFormComponentArgs) => {

      const updatedLayout: IInternalLayout = deepCopy(layout);
      const { components, order } = updatedLayout;

      if (id !== updatedComponent.id) {
        const newId = updatedComponent.id;
        components[newId] = {
          ...components[id],
          ...updatedComponent,
        };
        delete components[id];

        // Update ID in parent container order
        const parentContainerId = Object.keys(order).find(
          (containerId) => order[containerId].indexOf(id) > -1
        );
        const parentContainerOrder = order[parentContainerId];
        const containerIndex = parentContainerOrder.indexOf(id);
        parentContainerOrder[containerIndex] = newId;
      } else {
        components[id] = {
          ...components[id],
          ...updatedComponent,
        };
      }

      return formLayoutMutation.mutateAsync(updatedLayout).then(async (data) => {
        if (updatedComponent.type === ComponentType.FileUpload) {
          // Todo: Consider handling this in the backend
          const { maxNumberOfAttachments, minNumberOfAttachments, maxFileSizeInMB, validFileEndings } =
            updatedComponent as IFormFileUploaderComponent;
          if (id !== updatedComponent.id) {
            await addAppAttachmentMetadataMutation.mutateAsync({
              fileType: validFileEndings,
              id: updatedComponent.id,
              maxCount: maxNumberOfAttachments,
              maxSize: maxFileSizeInMB,
              minCount: minNumberOfAttachments,
            }).then(() => deleteAppAttachmentMetadataMutation.mutateAsync(id));
          } else {
            await updateAppAttachmentMetadata.mutateAsync({
              fileType: validFileEndings,
              id,
              maxCount: maxNumberOfAttachments,
              maxSize: maxFileSizeInMB,
              minCount: minNumberOfAttachments,
            });
          }
          return data;
        }
      });
    }
  });
}
