import React from 'react';

import { Number } from '@app/form-component';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const NumberComponent = ({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Number'>) => {
  const { textResourceBindings, value, icon, direction, formatting, grid } = useItemWhenType(baseComponentId, 'Number');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  const currentLanguage = useCurrentLanguage();

  const renderLabel = overrideDisplay?.renderLabel ?? true;
  const inTable = overrideDisplay?.renderedInTable === true;
  const showLabel = renderLabel && !inTable;

  if (isNaN(value)) {
    return null;
  }

  const numberFormatting = getMapToReactNumberConfig(formatting, value.toString(), currentLanguage);

  return (
    <Number
      componentId={componentId}
      value={value}
      formatting={numberFormatting}
      title={textResourceBindings?.title}
      description={showLabel ? textResourceBindings?.description : undefined}
      help={showLabel ? textResourceBindings?.help : undefined}
      hideLabel={!showLabel}
      icon={icon}
      direction={direction ?? 'horizontal'}
      labelGrid={grid?.labelGrid}
      innerGrid={innerGrid}
    />
  );
};
