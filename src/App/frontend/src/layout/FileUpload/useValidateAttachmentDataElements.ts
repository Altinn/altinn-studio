import { FormStore } from 'src/features/form/FormContext';
import { ValidationMask } from 'src/features/validation';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import type { ComponentValidation } from 'src/features/validation';

export function useValidateAttachmentDataElements(baseComponentId: string): ComponentValidation[] {
  const indexedId = useIndexedId(baseComponentId);

  return FormStore.raw.useMemoSelector((state) => {
    const nodeData = indexedId ? state.nodes.nodeData[indexedId] : undefined;
    if (!nodeData || !('attachments' in nodeData)) {
      return [];
    }

    return Object.values(nodeData.attachments).flatMap((attachment) => {
      if (!attachment.uploaded) {
        return [];
      }

      const otherValidations = state.validation.otherDataElementBackendValidations[attachment.data.id];
      if (!otherValidations) {
        return [];
      }

      return Object.values(otherValidations).flatMap((validationList) =>
        validationList.map(
          (validation): ComponentValidation => ({
            ...validation,
            // Backend categories are only shown here while `showAllUnboundValidations` is active.
            // After copying the validation onto the FileUpload node, we want it to stay visible through the
            // default post-submit mask, so we remap it to `Required`.
            category: ValidationMask.Required,
          }),
        ),
      );
    });
  });
}
