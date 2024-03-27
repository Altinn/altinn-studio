import type { IInternalLayout } from '../../types/global';
import { useMutation } from '@tanstack/react-query';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useAddAppAttachmentMetadataMutation } from './useAddAppAttachmentMetadataMutation';
import { useDeleteAppAttachmentMetadataMutation } from './useDeleteAppAttachmentMetadataMutation';
import { useUpdateAppAttachmentMetadataMutation } from './useUpdateAppAttachmentMetadataMutation';
import { switchSelectedFieldId } from '../../utils/ruleConfigUtils';
import { useRuleConfigQuery } from '../queries/useRuleConfigQuery';
import { useRuleConfigMutation } from './useRuleConfigMutation';
import { useFormLayout } from '../useFormLayoutsSelector';
import { ObjectUtils } from '@studio/pure-functions';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import type { FormComponent, FormFileUploaderComponent } from '../../types/FormComponent';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { TASKID_FOR_STATELESS_APPS } from 'app-shared/constants';

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
  const { data: ruleConfig } = useRuleConfigQuery(org, app, layoutSetName);
  const addAppAttachmentMetadataMutation = useAddAppAttachmentMetadataMutation(org, app);
  const deleteAppAttachmentMetadataMutation = useDeleteAppAttachmentMetadataMutation(org, app);
  const updateAppAttachmentMetadata = useUpdateAppAttachmentMetadataMutation(org, app);
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { mutateAsync: saveRuleConfig } = useRuleConfigMutation(org, app, layoutSetName);
  return useMutation({
    mutationFn: ({ updatedComponent, id }: UpdateFormComponentMutationArgs) => {
      const updatedLayout: IInternalLayout = ObjectUtils.deepCopy(layout);
      const { components, order } = updatedLayout;

      const currentId = id;
      const newId = updatedComponent.id;

      if (currentId !== newId) {
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

      return saveLayout(updatedLayout)
        .then(async (data) => {
          if (
            updatedComponent.type === ComponentType.FileUpload ||
            updatedComponent.type === ComponentType.FileUploadWithTag
          ) {
            // Todo: Consider handling this in the backend
            const taskId = layoutSets
              ? layoutSets?.sets.find((set) => set.id === layoutSetName)?.tasks[0]
              : TASKID_FOR_STATELESS_APPS;
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
    onSuccess: async ({ currentId, newId }) => {
      await switchSelectedFieldId(ruleConfig, currentId, newId, saveRuleConfig);
    },
  });
};
