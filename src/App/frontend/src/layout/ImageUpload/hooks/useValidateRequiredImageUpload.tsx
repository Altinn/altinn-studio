import { type ComponentValidation, FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

export function useValidateRequiredImageUpload(baseComponentId: string): ComponentValidation[] {
  const item = useItemWhenType(baseComponentId, 'ImageUpload');
  const attachments = NodesInternal.useAttachments(useIndexedId(baseComponentId));

  if (!item?.required || attachments.length > 0) {
    return [];
  }

  return [
    {
      message: {
        key: 'image_upload_component.error_required',
      },
      severity: 'error',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Required,
    },
  ];
}
