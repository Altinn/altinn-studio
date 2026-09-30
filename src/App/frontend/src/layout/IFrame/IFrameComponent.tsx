import React from 'react';
import type { JSX } from 'react';

import { IFrame as IFrameLayout } from '@app/form-component';

import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const IFrameComponent = ({ baseComponentId }: PropsFromGenericComponent<'IFrame'>): JSX.Element => {
  const { textResourceBindings, sandbox } = useItemWhenType(baseComponentId, 'IFrame');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  return (
    <IFrameLayout
      componentId={componentId}
      title={textResourceBindings?.title}
      sandbox={sandbox}
      innerGrid={innerGrid}
    />
  );
};
