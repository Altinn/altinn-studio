import React from 'react';

import { Video } from '@app/form-component';

import { useParentCard } from 'src/layout/Cards/CardContext';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function VideoComponent({ baseComponentId }: PropsFromGenericComponent<'Video'>) {
  const { video, textResourceBindings } = useItemWhenType(baseComponentId, 'Video');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  const parentCard = useParentCard();
  const mediaHeight = parentCard?.renderedInMedia ? parentCard.minMediaHeight : undefined;

  return (
    <Video
      componentId={componentId}
      src={video?.src}
      altText={textResourceBindings?.altText}
      mediaHeight={mediaHeight}
      innerGrid={innerGrid}
    />
  );
}
