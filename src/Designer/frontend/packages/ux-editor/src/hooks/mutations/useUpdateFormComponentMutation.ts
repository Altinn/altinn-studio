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
import { isItemChildOfContainer } from '../../utils/formLayoutUtils';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';

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
  const handleFileUploadUpdate = useHandleFileUploadComponentUpdate(org, app, layoutSetName);

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
          // Todo: Consider handling this in the backend
          if (isFileUploadComponent(updatedComponent)) {
            await handleFileUploadUpdate({
              updatedComponent,
              oldId: id,
              updatedLayout,
            });
          }
          return data;
        })
        .then(() => ({ currentId, newId }));
    },
  });
};

const isFileUploadComponent = (
  component: FormComponent,
): component is FormFileUploaderComponent => {
  return (
    component.type === ComponentType.FileUpload ||
    component.type === ComponentType.FileUploadWithTag
  );
};

type UseHandleFileUploadComponentUpdateParams = {
  updatedComponent: FormFileUploaderComponent;
  oldId: string;
  updatedLayout: IInternalLayout;
};

const useHandleFileUploadComponentUpdate = (org: string, app: string, layoutSetName: string) => {
  const addAppAttachmentMetadataMutation = useAddAppAttachmentMetadataMutation(org, app);
  const deleteAppAttachmentMetadataMutation = useDeleteAppAttachmentMetadataMutation(org, app);
  const updateAppAttachmentMetadata = useUpdateAppAttachmentMetadataMutation(org, app);
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const taskId = useSelectedTaskId(layoutSetName);
  const updateBpmn = useUpdateBpmn(org, app);

  return async ({
    updatedComponent,
    oldId,
    updatedLayout,
  }: UseHandleFileUploadComponentUpdateParams): Promise<void> => {
    const oldDataType = appMetadata?.dataTypes?.find(
      (dataType) => dataType.id === updatedComponent.id,
    ) as ApplicationAttachmentMetadata;
    const metadataParams = buildDataTypeForFileUpload(
      updatedComponent,
      updatedLayout,
      taskId,
      oldDataType,
    );

    if (oldId !== updatedComponent.id) {
      await addAppAttachmentMetadataMutation.mutateAsync({
        ...metadataParams,
        id: updatedComponent.id,
      });
      await deleteAppAttachmentMetadataMutation.mutateAsync(oldId);
      await updateBpmn(updateDataTypeIdsToSign([{ oldId, newId: updatedComponent.id }]));
    } else {
      await updateAppAttachmentMetadata.mutateAsync({
        ...metadataParams,
        id: oldId,
      });
    }
  };
};

const buildDataTypeForFileUpload = (
  component: FormFileUploaderComponent,
  layout: IInternalLayout,
  taskId: string,
  oldDataType?: ApplicationAttachmentMetadata,
): ApplicationAttachmentMetadata => {
  const baseDataType: ApplicationAttachmentMetadata = {
    id: component.id,
    fileType: component.validFileEndings,
    taskId,
    maxSize: component.maxFileSizeInMB,
    maxCount: component.maxNumberOfAttachments,
    minCount: component.minNumberOfAttachments,
  };

  const isInRepeatingGroup = isItemChildOfContainer(
    layout,
    component.id,
    ComponentType.RepeatingGroup,
  );

  if (!isInRepeatingGroup) {
    return baseDataType;
  }

  return {
    ...baseDataType,
    maxCount:
      component.maxNumberOfAttachments > oldDataType?.maxCount
        ? component.maxNumberOfAttachments
        : oldDataType?.maxCount,
    minCount: oldDataType?.minCount,
  };
};
