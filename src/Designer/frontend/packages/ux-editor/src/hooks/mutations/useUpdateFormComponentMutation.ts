import type { IInternalLayout } from '../../types/global';
import { useMutation } from '@tanstack/react-query';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
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
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import { getFileUploadMetadataProperties } from '../../utils/fileUploadMetadata';
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
        if (updatedLayout.pageIndexes?.[id] !== undefined) {
          updatedLayout.pageIndexes[newId] = updatedLayout.pageIndexes[id];
          delete updatedLayout.pageIndexes[id];
        }

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
              oldComponent: layout.components[id] as FormFileUploaderComponent,
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
  oldComponent?: FormFileUploaderComponent;
  updatedLayout: IInternalLayout;
};

const useHandleFileUploadComponentUpdate = (org: string, app: string, layoutSetName: string) => {
  const moveAttachmentDataType = useMoveAttachmentDataType(org, app);
  const updateAppAttachmentMetadata = useUpdateAppAttachmentMetadataMutation(org, app);
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const taskId = useSelectedTaskId(layoutSetName);

  return async ({
    updatedComponent,
    oldId,
    oldComponent,
    updatedLayout,
  }: UseHandleFileUploadComponentUpdateParams): Promise<void> => {
    const oldDataType = findAttachmentDataType(appMetadata, oldId);
    const metadataParams = buildDataTypeForFileUpload(
      updatedComponent,
      updatedLayout,
      taskId,
      oldDataType,
      oldComponent,
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
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const taskId = useSelectedTaskId(layoutSetName);

  return async ({ oldId, newId }: UseHandleImageUploadComponentIdChangeParams): Promise<void> => {
    const oldDataType = findAttachmentDataType(appMetadata, oldId);

    await moveAttachmentDataType(oldId, {
      ...imageUploadDefaultDataType,
      taskId,
      ...oldDataType,
      id: newId,
    });
  };
};

const findAttachmentDataType = (
  appMetadata: ApplicationMetadata | undefined,
  dataTypeId: string,
): ApplicationAttachmentMetadata | undefined =>
  appMetadata?.dataTypes?.find(
    (dataType) => dataType.id === dataTypeId,
  ) as ApplicationAttachmentMetadata;

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
  oldComponent?: FormFileUploaderComponent,
): ApplicationAttachmentMetadata => {
  const metadataProperties = getFileUploadMetadataProperties(component);
  const baseDataType: ApplicationAttachmentMetadata = {
    id: component.id,
    taskId,
    ...metadataProperties,
    minCount: shouldUpdateMinCount(metadataProperties.minCount, oldDataType, oldComponent)
      ? metadataProperties.minCount
      : oldDataType.minCount,
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
      baseDataType.maxCount > oldDataType?.maxCount ? baseDataType.maxCount : oldDataType?.maxCount,
    minCount: oldDataType?.minCount,
  };
};

/**
 * minCount follows the component's minNumberOfAttachments, unless it was lower before the save and is not higher
 * than the new minNumberOfAttachments. A lower minCount has been set on purpose, typically 0 on an attachment that
 * is required only while the component is shown, since the backend counts data elements for the whole task and
 * does not check `hidden`. A higher minCount would make the backend stricter than the form, so it is updated.
 * An old minNumberOfAttachments that is not a static number counts as 0, so minCount follows the new one.
 */
const shouldUpdateMinCount = (
  minNumberOfAttachments: number,
  oldDataType?: ApplicationAttachmentMetadata,
  oldComponent?: FormFileUploaderComponent,
): boolean => {
  if (oldDataType === undefined || oldComponent === undefined) return true;
  const oldMinCount = oldDataType.minCount ?? 0;
  const oldMinNumberOfAttachments =
    typeof oldComponent.minNumberOfAttachments === 'number'
      ? oldComponent.minNumberOfAttachments
      : 0;
  return oldMinCount >= oldMinNumberOfAttachments || oldMinCount > minNumberOfAttachments;
};
