import React from 'react';

import { Link as LinkLayout } from '@app/form-component';

import type { PropsFromGenericComponent } from '..';

import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

export function LinkComponent({ baseComponentId }: PropsFromGenericComponent<'Link'>) {
  const { style, position, openInNewTab, textResourceBindings, size, fullWidth, textAlign } = useItemWhenType(
    baseComponentId,
    'Link',
  );
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  return (
    <LinkLayout
      componentId={componentId}
      style={style}
      title={textResourceBindings?.title}
      target={textResourceBindings?.target}
      download={textResourceBindings?.download}
      openInNewTab={openInNewTab}
      size={size}
      fullWidth={fullWidth}
      textAlign={textAlign}
      position={position}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
}
