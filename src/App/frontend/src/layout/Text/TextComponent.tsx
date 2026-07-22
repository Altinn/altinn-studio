import React from 'react';

import { Text } from '@app/form-component';

import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const TextComponent = ({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Text'>) => {
  const { textResourceBindings, value, icon, direction } = useItemWhenType(baseComponentId, 'Text');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  const renderLabel = overrideDisplay?.renderLabel ?? true;
  const inTable = overrideDisplay?.renderedInTable === true;
  const showLabel = renderLabel && !inTable;

  return (
    <Text
      componentId={componentId}
      value={value}
      title={showLabel ? textResourceBindings?.title : undefined}
      description={showLabel ? textResourceBindings?.description : undefined}
      help={showLabel ? textResourceBindings?.help : undefined}
      icon={icon}
      direction={direction ?? 'horizontal'}
      innerGrid={innerGrid}
    />
  );
};
