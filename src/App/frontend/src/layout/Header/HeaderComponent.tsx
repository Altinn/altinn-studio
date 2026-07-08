import React from 'react';

import { Header } from '@app/form-component';

import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function HeaderComponent({ baseComponentId }: PropsFromGenericComponent<'Header'>) {
  const { size, textResourceBindings } = useItemWhenType(baseComponentId, 'Header');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  return (
    <Header
      componentId={componentId}
      title={textResourceBindings?.title}
      help={textResourceBindings?.help}
      size={size}
      innerGrid={innerGrid}
    />
  );
}
