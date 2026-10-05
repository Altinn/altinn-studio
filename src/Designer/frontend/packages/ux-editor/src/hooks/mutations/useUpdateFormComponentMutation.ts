import type { IInternalLayout } from '../../types/global';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import { imageUploadDefaultDataType } from './useAddItemToLayoutMutation';

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
  const handleImageUploadIdChange = useHandleImageUploadComponentIdChange(org, app, layoutSetName);

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
          if (isImageUploadComponent(updatedComponent) && currentId !== newId) {
            await handleImageUploadIdChange({ oldId: currentId, newId });
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
  return component.type === ComponentType.FileUpload;
};

const isImageUploadComponent = (
  component: FormComponent,
): component is FormComponent<ComponentType.ImageUpload> => {
  return component.type === ComponentType.ImageUpload;
};

type UseHandleFileUploadComponentUpdateParams = {
  updatedComponent: FormFileUploaderComponent;
  oldId: string;
  updatedLayout: IInternalLayout;
};

const useHandleFileUploadComponentUpdate = (org: string, app: string, layoutSetName: string) => {
  const moveAttachmentDataType = useMoveAttachmentDataType(org, app);
  const updateAppAttachmentMetadata = useUpdateAppAttachmentMetadataMutation(org, app);
  const getAttachmentDataType = useGetAttachmentDataType(org, app);
  const taskId = useSelectedTaskId(layoutSetName);

  return async ({
    updatedComponent,
    oldId,
    updatedLayout,
  }: UseHandleFileUploadComponentUpdateParams): Promise<void> => {
    const oldDataType = await getAttachmentDataType(oldId);
    const metadataParams = buildDataTypeForFileUpload(
      updatedComponent,
      updatedLayout,
      taskId,
      oldDataType,
    );

    if (oldId !== updatedComponent.id) {
      await moveAttachmentDataType(oldId, {
        ...oldDataType,
        ...metadataParams,
        id: updatedComponent.id,
      });
    } else {
      await updateAppAttachmentMetadata.mutateAsync({
        ...metadataParams,
        id: oldId,
      });
    }
  };
};

type UseHandleImageUploadComponentIdChangeParams = {
  oldId: string;
  newId: string;
};

const useHandleImageUploadComponentIdChange = (org: string, app: string, layoutSetName: string) => {
  const moveAttachmentDataType = useMoveAttachmentDataType(org, app);
  const getAttachmentDataType = useGetAttachmentDataType(org, app);
  const taskId = useSelectedTaskId(layoutSetName);

  return async ({ oldId, newId }: UseHandleImageUploadComponentIdChangeParams): Promise<void> => {
    const oldDataType = await getAttachmentDataType(oldId);

    await moveAttachmentDataType(oldId, {
      ...imageUploadDefaultDataType,
      taskId,
      ...oldDataType,
      id: newId,
    });
  };
};

const useGetAttachmentDataType = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { getAppMetadata } = useServicesContext();

  return async (dataTypeId: string): Promise<ApplicationAttachmentMetadata | undefined> => {
    const appMetadata = await queryClient.ensureQueryData({
      queryKey: [QueryKey.AppMetadata, org, app],
      queryFn: () => getAppMetadata(org, app),
    });
    return appMetadata?.dataTypes?.find(
      (dataType) => dataType.id === dataTypeId,
    ) as ApplicationAttachmentMetadata;
  };
};

const useMoveAttachmentDataType = (org: string, app: string) => {
  const addAppAttachmentMetadataMutation = useAddAppAttachmentMetadataMutation(org, app);
  const deleteAppAttachmentMetadataMutation = useDeleteAppAttachmentMetadataMutation(org, app);
  const updateBpmn = useUpdateBpmn(org, app);

  return async (oldId: string, newDataType: ApplicationAttachmentMetadata): Promise<void> => {
    await addAppAttachmentMetadataMutation.mutateAsync(newDataType);
    await deleteAppAttachmentMetadataMutation.mutateAsync(oldId);
    await updateBpmn(updateDataTypeIdsToSign([{ oldId, newId: newDataType.id }]));
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
