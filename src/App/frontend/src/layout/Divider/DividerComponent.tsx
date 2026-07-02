import React from 'react';

import { Divider } from '@app/form-component';

import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import type { PropsFromGenericComponent } from 'src/layout/index';

export function DividerComponent({ baseComponentId }: PropsFromGenericComponent<'Divider'>) {
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  return (
    <Divider
      componentId={componentId}
      innerGrid={innerGrid}
    />
  );
}
