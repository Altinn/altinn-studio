import React from 'react';

import { Lommebok } from '@app/form-component';

import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useLabelData } from 'src/utils/layout/useLabelData';
import type { PropsFromGenericComponent } from 'src/layout';

export function LommebokComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Lommebok'>) {
  const { title, help, description } = useLabelData({ baseComponentId, overrideDisplay });
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  return (
    <Lommebok
      componentId={componentId}
      title={title}
      description={description}
      help={help}
      innerGrid={innerGrid}
    />
  );
}
