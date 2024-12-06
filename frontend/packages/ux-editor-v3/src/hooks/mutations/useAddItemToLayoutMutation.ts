import { useSelectedFormLayoutWithName } from '../useFormLayoutsSelector';
import { useMutation } from '@tanstack/react-query';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { useAddAppAttachmentMetadataMutation } from './useAddAppAttachmentMetadataMutation';
import type { FormFileUploaderComponent } from '../../types/FormComponent';
import { addItemOfType } from '../../utils/formLayoutUtils';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { TASKID_FOR_STATELESS_APPS } from 'app-shared/constants';

export interface AddFormItemMutationArgs {
  componentType: ComponentTypeV3;
  newId: string;
  parentId: string;
  index: number;
}

export const useAddItemToLayoutMutation = (org: string, app: string, layoutSetName: string) => {
  const { layout, layoutName } = useSelectedFormLayoutWithName();
  const formLayoutsMutation = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  const appAttachmentMetadataMutation = useAddAppAttachmentMetadataMutation(org, app);
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  return useMutation({
    mutationFn: ({ componentType, newId, parentId, index }: AddFormItemMutationArgs) => {
      const updatedLayout = addItemOfType(layout, componentType, newId, parentId, index);

      if (!layout) return;

      return formLayoutsMutation.mutateAsync(updatedLayout).then(() => {
        if (
          componentType === ComponentTypeV3.FileUpload ||
          componentType === ComponentTypeV3.FileUploadWithTag
        ) {
          const taskId = layoutSets
            ? layoutSets?.sets.find((set) => set.id === layoutSetName)?.tasks[0]
            : TASKID_FOR_STATELESS_APPS;
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
      });
    },
  });
};
