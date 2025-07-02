import { isAttachmentUploaded } from 'src/features/attachments';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { AttachmentValidation, ComponentValidation } from 'src/features/validation';

export function useValidateMissingTag(baseComponentId: string): ComponentValidation[] {
  const item = useItemWhenType(baseComponentId, 'FileUploadWithTag');
  const tagKey = item?.textResourceBindings?.tagTitle;
  const attachments = NodesInternal.useAttachments(useIndexedId(baseComponentId));
  const validations: ComponentValidation[] = [];

  for (const attachment of attachments) {
    if (isAttachmentUploaded(attachment) && (attachment.data.tags === undefined || attachment.data.tags.length === 0)) {
      const tagReference = tagKey
        ? {
            key: tagKey,
            makeLowerCase: true,
          }
        : 'tag';

      const validation: AttachmentValidation = {
        message: {
          key: 'form_filler.file_uploader_validation_error_no_chosen_tag',
          params: [tagReference],
        },
        severity: 'error',
        source: FrontendValidationSource.Component,
        attachmentId: attachment.data.id,
        // Treat visibility of missing tag the same as required to prevent showing an error immediately
        category: ValidationMask.Required,
      };
      validations.push(validation);
    }
  }

  return validations;
}
