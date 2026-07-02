import React from 'react';

import { Divider } from '@app/form-component';

import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import type { PropsFromGenericComponent } from 'src/layout/index';

export function DividerComponent({ baseComponentId }: PropsFromGenericComponent<'Divider'>) {
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  return (
    <Divider
      componentId={componentId}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
}
