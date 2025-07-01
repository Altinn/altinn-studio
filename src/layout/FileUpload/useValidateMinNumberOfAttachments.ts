import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { ComponentValidation } from 'src/features/validation';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function useValidateMinNumberOfAttachments(
  node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>,
): ComponentValidation[] {
  const minNumberOfAttachments = useNodeItem(node, (item) => item.minNumberOfAttachments);
  const attachments = NodesInternal.useAttachments(node.id);
  const validations: ComponentValidation[] = [];

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
