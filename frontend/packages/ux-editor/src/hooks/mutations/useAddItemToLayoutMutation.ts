import { useSelectedFormLayoutWithName } from '../';
import { useMutation } from '@tanstack/react-query';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { useAddAppAttachmentMetadataMutation } from './useAddAppAttachmentMetadataMutation';
import type { FormFileUploaderComponent } from '../../types/FormComponent';
import { addItemOfType } from '../../utils/formLayoutUtils';
import { useSelectedTaskId } from 'app-shared/hooks/useSelectedTaskId';
import { toast } from 'react-toastify';

export interface AddFormItemMutationArgs {
  componentType: ComponentType;
  newId: string;
  parentId: string;
  index: number;
}

export const useAddItemToLayoutMutation = (org: string, app: string, layoutSetName: string) => {
  const { layout, layoutName } = useSelectedFormLayoutWithName();
  const taskId = useSelectedTaskId(layoutSetName);
  const formLayoutsMutation = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  const appAttachmentMetadataMutation = useAddAppAttachmentMetadataMutation(org, app);

  return useMutation({
    mutationFn: ({ componentType, newId, parentId, index }: AddFormItemMutationArgs) => {
      const updatedLayout = addItemOfType(layout, componentType, newId, parentId, index);

      if (!layout) return;

      return formLayoutsMutation
        .mutateAsync({ internalLayout: updatedLayout })
        .then(() => {
          if (
            componentType === ComponentType.FileUpload ||
            componentType === ComponentType.FileUploadWithTag
          ) {
            const fileUploadComponent = updatedLayout.components[newId];
            // Todo: Consider to handle this in the backend. It should not be necessary to make two calls.
            const {
              maxNumberOfAttachments,
              minNumberOfAttachments,
              maxFileSizeInMB,
              validFileEndings,
            } = fileUploadComponent as FormFileUploaderComponent;
            appAttachmentMetadataMutation.mutate({
              id: newId,
              taskId: taskId,
              maxCount: maxNumberOfAttachments,
              minCount: minNumberOfAttachments,
              fileType: validFileEndings,
              maxSize: maxFileSizeInMB,
            });
          }
          return newId; // Returns created id
        })
        .catch((error) => {
          toast.error('useAddItemToLayoutMutation --- ', error);

          return error;
        });
    },
  });
};
