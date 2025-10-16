import type { IInternalLayout } from '../../types/global';
import { useMutation } from '@tanstack/react-query';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useAddAppAttachmentMetadataMutation } from './useAddAppAttachmentMetadataMutation';
import { useDeleteAppAttachmentMetadataMutation } from './useDeleteAppAttachmentMetadataMutation';
import { useUpdateAppAttachmentMetadataMutation } from './useUpdateAppAttachmentMetadataMutation';
import { useFormLayout } from '../';
import { ObjectUtils } from '@studio/pure-functions';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import type { FormComponent, FormFileUploaderComponent } from '../../types/FormComponent';
import { useUpdateBpmn } from 'app-shared/hooks/useUpdateBpmn';
import { updateDataTypeIdsToSign } from 'app-shared/utils/bpmnUtils';
import { useSelectedTaskId } from 'app-shared/hooks/useSelectedTaskId';
import { isItemChildOfContainer } from '@altinn/ux-editor/utils/formLayoutUtils';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';

export interface UpdateFormComponentMutationArgs {
  updatedComponent: FormComponent;
  id: string;
}

export const useUpdateFormComponentMutation = (
  org: string,
  app: string,
  layoutName: string,
  layoutSetName: string,
) => {
  const layout = useFormLayout(layoutName);
  const { mutateAsync: saveLayout } = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  const addAppAttachmentMetadataMutation = useAddAppAttachmentMetadataMutation(org, app);
  const deleteAppAttachmentMetadataMutation = useDeleteAppAttachmentMetadataMutation(org, app);
  const updateAppAttachmentMetadata = useUpdateAppAttachmentMetadataMutation(org, app);
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const taskId = useSelectedTaskId(layoutSetName);
  const updateBpmn = useUpdateBpmn(org, app);
  return useMutation({
    mutationFn: ({ updatedComponent, id }: UpdateFormComponentMutationArgs) => {
      const updatedLayout: IInternalLayout = ObjectUtils.deepCopy(layout);
      const { components, order } = updatedLayout;

      const currentId = id;
      const newId = updatedComponent.id;
      let componentIdsChange;

      if (currentId !== newId) {
        componentIdsChange = [{ oldComponentId: currentId, newComponentId: newId }];
        components[newId] = updatedComponent;
        delete components[id];

        // Update ID in parent container order
        const parentContainerId = Object.keys(order).find(
          (containerId) => order[containerId].indexOf(id) > -1,
        );
        const parentContainerOrder = order[parentContainerId];
        const containerIndex = parentContainerOrder.indexOf(id);
        parentContainerOrder[containerIndex] = newId;
      } else {
        if (
          components[id]?.type === ComponentType.RadioButtons ||
          components[id]?.type === ComponentType.Checkboxes
        ) {
          delete components[id].options;
          delete components[id].optionsId;
        }
        components[id] = updatedComponent;
      }

      return saveLayout({ internalLayout: updatedLayout, componentIdsChange })
        .then(async (data) => {
          if (
            updatedComponent.type === ComponentType.FileUpload ||
            updatedComponent.type === ComponentType.FileUploadWithTag
          ) {
            // Todo: Consider handling this in the backend
            const fileUploadDataType = appMetadata?.dataTypes?.find(
              (dataType) => dataType.id === updatedComponent.id,
            );
            if (
              isItemChildOfContainer(
                updatedLayout,
                updatedComponent.id,
                ComponentType.RepeatingGroup,
              ) &&
              fileUploadDataType?.maxCount >= updatedComponent.maxNumberOfAttachments
            ) {
              return;
            }
            const {
              maxNumberOfAttachments,
              minNumberOfAttachments,
              maxFileSizeInMB,
              validFileEndings,
            } = updatedComponent as FormFileUploaderComponent;
            if (id !== updatedComponent.id) {
              await addAppAttachmentMetadataMutation
                .mutateAsync({
                  fileType: validFileEndings,
                  id: updatedComponent.id,
                  taskId: taskId,
                  maxCount: maxNumberOfAttachments,
                  maxSize: maxFileSizeInMB,
                  minCount: minNumberOfAttachments,
                })
                .then(() => deleteAppAttachmentMetadataMutation.mutateAsync(id));
              await updateBpmn(
                updateDataTypeIdsToSign([
                  {
                    oldId: id,
                    newId: updatedComponent.id,
                  },
                ]),
              );
            } else {
              await updateAppAttachmentMetadata.mutateAsync({
                fileType: validFileEndings,
                id,
                taskId: taskId,
                maxCount: maxNumberOfAttachments,
                maxSize: maxFileSizeInMB,
                minCount: minNumberOfAttachments,
              });
            }
            return data;
          }
        })
        .then(() => ({ currentId, newId }));
    },
  });
};
