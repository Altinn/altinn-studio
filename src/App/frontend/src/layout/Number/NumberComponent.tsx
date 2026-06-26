import React from 'react';

import { NumberLayout } from '@app/form-component';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const NumberComponent = ({ baseComponentId }: PropsFromGenericComponent<'Number'>) => {
  const { textResourceBindings, value, icon, direction, formatting } = useItemWhenType(baseComponentId, 'Number');
  const currentLanguage = useCurrentLanguage();
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  const numberFormatting = getMapToReactNumberConfig(formatting, value.toString(), currentLanguage);

  return (
    <NumberLayout
      value={value}
      formatting={numberFormatting}
      icon={icon}
      direction={direction}
      title={textResourceBindings?.title}
      componentId={componentId}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
};
