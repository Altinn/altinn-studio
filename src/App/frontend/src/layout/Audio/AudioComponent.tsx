import React from 'react';

import { Audio } from '@app/form-component';

import { useParentCard } from 'src/layout/Cards/CardContext';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function AudioComponent({ baseComponentId }: PropsFromGenericComponent<'Audio'>) {
  const { audio, textResourceBindings } = useItemWhenType(baseComponentId, 'Audio');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  const parentCard = useParentCard();
  const mediaHeight = parentCard?.renderedInMedia ? parentCard.minMediaHeight : undefined;

  return (
    <Audio
      componentId={componentId}
      src={audio?.src}
      altText={textResourceBindings?.altText}
      mediaHeight={mediaHeight}
      innerGrid={innerGrid}
    />
  );
}
