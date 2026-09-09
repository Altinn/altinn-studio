import React from 'react';

import { Heading } from '@app/form-component';

import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function HeadingComponent({ baseComponentId }: PropsFromGenericComponent<'Heading'>) {
  const { size, textResourceBindings } = useItemWhenType(baseComponentId, 'Heading');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  return (
    <Heading
      componentId={componentId}
      title={textResourceBindings?.title}
      help={textResourceBindings?.help}
      size={size}
      innerGrid={innerGrid}
    />
  );
}
