import React from 'react';

import { PrintButton } from '@app/form-component';

import type { PropsFromGenericComponent } from '..';

import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

export const PrintButtonComponent = ({ baseComponentId }: PropsFromGenericComponent<'PrintButton'>) => {
  const { textResourceBindings } = useItemWhenType(baseComponentId, 'PrintButton');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  return (
    <PrintButton
      componentId={componentId}
      title={textResourceBindings?.title}
      onClick={window.print}
      innerGrid={innerGrid}
    />
  );
};
