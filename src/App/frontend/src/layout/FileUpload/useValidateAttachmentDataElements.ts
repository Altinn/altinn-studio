import { isAttachmentUploaded } from 'src/features/attachments';
import { FileScanResults } from 'src/features/attachments/types';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import type { IAttachment } from 'src/features/attachments';
import type { AnyValidation, DataModelValidations } from 'src/features/validation';

export function validateAttachmentDataElements(
  attachments: IAttachment[],
  otherDataElementBackendValidations: DataModelValidations,
): AnyValidation[] {
  return attachments.flatMap((attachment) => {
    if (!isAttachmentUploaded(attachment)) {
      return [];
    }

    const infectedFileValidation: AnyValidation[] =
      attachment.data.fileScanResult === FileScanResults.Infected
        ? [
            {
              source: FrontendValidationSource.Component,
              message: {
                key: 'general.wait_for_attachments_infected',
                params: [attachment.data.filename],
              },
              severity: 'error',
              category: ValidationMask.Component,
            },
          ]
        : [];

    const otherValidations = otherDataElementBackendValidations[attachment.data.id];
    if (!otherValidations) {
      return infectedFileValidation;
    }

    return [
      ...infectedFileValidation,
      ...Object.values(otherValidations).flatMap((validationList) =>
        validationList.map((validation): AnyValidation => ({
          ...validation,
          // Backend categories are only shown here while `showAllUnboundValidations` is active.
          // After copying the validation onto the FileUpload node, we want it to stay visible through the
          // default post-submit mask, so we remap it to `Required`.
          category: ValidationMask.Required,
        })),
      ),
    ];
  });
}
