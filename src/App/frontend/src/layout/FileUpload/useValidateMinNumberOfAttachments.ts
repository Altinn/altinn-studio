import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useExternalItem } from 'src/utils/layout/hooks';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { ComponentValidation } from 'src/features/validation';

export function useValidateMinNumberOfAttachments(baseComponentId: string): ComponentValidation[] {
  const validations: ComponentValidation[] = [];
  const component = useExternalItem(baseComponentId);
  const attachments = NodesInternal.useAttachments(useIndexedId(baseComponentId));
  const minNumberOfAttachments = useItemWhenType<'FileUpload' | 'FileUploadWithTag'>(
    baseComponentId,
    (t) => t === 'FileUpload' || t === 'FileUploadWithTag',
  ).minNumberOfAttachments;
  if (!component || (component.type !== 'FileUpload' && component.type !== 'FileUploadWithTag')) {
    return validations;
  }

  if (
    minNumberOfAttachments !== undefined &&
    minNumberOfAttachments > 0 &&
    attachments.length < minNumberOfAttachments
  ) {
    validations.push({
      message: {
        key: 'form_filler.file_uploader_validation_error_file_number',
        params: [minNumberOfAttachments],
      },
      severity: 'error',
      source: FrontendValidationSource.Component,
      // Treat visibility of minNumberOfAttachments the same as required to prevent showing an error immediately
      category: ValidationMask.Required,
    });
  }

  return validations;
}
