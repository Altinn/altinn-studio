import React from 'react';

import { IMAGE_TYPE, ImageUploadLayout } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useImageFile } from 'src/layout/ImageUpload/hooks/useImageFile';
import { isAllowedContentTypesValid } from 'src/layout/ImageUpload/imageUploadUtils';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import { useLabelData } from 'src/utils/layout/useLabelData';
import type { PropsFromGenericComponent } from 'src/layout';

export function ImageUploadComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'ImageUpload'>) {
  const { dataTypes } = getApplicationMetadata();
  const config = useComponentConfig(baseComponentId, 'ImageUpload');
  const readOnly = useEvalExpression(config.readOnly, Expressions.ImageUpload.readOnly);

  const { storedImage, imageUrl, saveImage, deleteImage } = useImageFile(baseComponentId);
  const { title, help, description, required, showOptionalMarking } = useLabelData({
    baseComponentId,
    overrideDisplay,
  });
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  if (!isAllowedContentTypesValid({ baseComponentId, dataTypes })) {
    throw new Error(
      `allowedContentTypes is configured for '${baseComponentId}', but is missing '${IMAGE_TYPE}' which is required for ImageUpload components.`,
    );
  }

  return (
    <ImageUploadLayout
      componentId={componentId}
      crop={config.crop}
      readOnly={readOnly}
      required={required}
      showOptionalMarking={showOptionalMarking}
      title={title}
      help={help}
      description={description}
      storedImage={storedImage}
      imageUrl={imageUrl}
      onSave={saveImage}
      onDelete={deleteImage}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
}
