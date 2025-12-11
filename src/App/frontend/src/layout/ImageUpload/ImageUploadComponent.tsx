import React from 'react';

import { Label } from 'src/app-components/Label/Label';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { ImageCropper } from 'src/layout/ImageUpload/ImageCropper';
import { getCropArea, IMAGE_TYPE, isAllowedContentTypesValid } from 'src/layout/ImageUpload/imageUploadUtils';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function ImageUploadComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'ImageUpload'>) {
  const { dataTypes } = useApplicationMetadata();
  const { id, crop, grid, required, readOnly } = useItemWhenType(baseComponentId, 'ImageUpload');
  const { labelText, getRequiredComponent, getOptionalComponent, getHelpTextComponent, getDescriptionComponent } =
    useLabel({ baseComponentId, overrideDisplay });

  if (!isAllowedContentTypesValid({ baseComponentId, dataTypes })) {
    throw new Error(
      `allowedContentTypes is configured for '${baseComponentId}', but is missing '${IMAGE_TYPE}' which is required for ImageUpload components.`,
    );
  }

  return (
    <Label
      htmlFor={id}
      label={labelText}
      grid={grid?.labelGrid}
      required={required}
      requiredIndicator={getRequiredComponent()}
      optionalIndicator={getOptionalComponent()}
      help={getHelpTextComponent()}
      description={getDescriptionComponent()}
    >
      <ComponentStructureWrapper baseComponentId={baseComponentId}>
        <ImageCropper
          cropArea={getCropArea(crop)}
          baseComponentId={baseComponentId}
          readOnly={!!readOnly}
        />
      </ComponentStructureWrapper>
    </Label>
  );
}
