import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { useExternalItem } from 'src/utils/layout/hooks';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { ComponentValidation } from 'src/features/validation';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function useValidateMinNumberOfAttachments(
  node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>,
): ComponentValidation[] {
  const validations: ComponentValidation[] = [];
  const component = useExternalItem(node.baseId);
  const attachments = NodesInternal.useAttachments(node.id);
  if (!component || (component.type !== 'FileUpload' && component.type !== 'FileUploadWithTag')) {
    return validations;
  }

  if (
    component.minNumberOfAttachments !== undefined &&
    component.minNumberOfAttachments > 0 &&
    attachments.length < component.minNumberOfAttachments
  ) {
    validations.push({
      message: {
        key: 'form_filler.file_uploader_validation_error_file_number',
        params: [component.minNumberOfAttachments],
      },
      severity: 'error',
      source: FrontendValidationSource.Component,
      // Treat visibility of minNumberOfAttachments the same as required to prevent showing an error immediately
      category: ValidationMask.Required,
    });
  }

  return validations;
}
