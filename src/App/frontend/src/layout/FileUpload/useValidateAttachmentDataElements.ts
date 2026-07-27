import { ValidationMask } from 'src/features/validation';
import type { IAttachment } from 'src/features/attachments';
import type { AnyValidation, DataModelValidations } from 'src/features/validation';

export function validateAttachmentDataElements(
  attachments: IAttachment[],
  otherDataElementBackendValidations: DataModelValidations,
): AnyValidation[] {
  return attachments.flatMap((attachment) => {
    if (!attachment.uploaded) {
      return [];
    }

    const otherValidations = otherDataElementBackendValidations[attachment.data.id];
    if (!otherValidations) {
      return [];
    }

    return Object.values(otherValidations).flatMap((validationList) =>
      validationList.map(
        (validation): AnyValidation => ({
          ...validation,
          // Backend categories are only shown here while `showAllUnboundValidations` is active.
          // After copying the validation onto the FileUpload node, we want it to stay visible through the
          // default post-submit mask, so we remap it to `Required`.
          category: ValidationMask.Required,
        }),
      ),
    );
  });
}
