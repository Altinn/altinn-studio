import React from 'react';

import { Video } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useParentCard } from 'src/layout/Cards/CardContext';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function VideoComponent({ baseComponentId }: PropsFromGenericComponent<'Video'>) {
  const config = useComponentConfig(baseComponentId, 'Video');
  const altText = useEvalExpression(
    config.textResourceBindings?.altText,
    Expressions.Video.textResourceBindings.altText,
  );

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  const parentCard = useParentCard();
  const mediaHeight = parentCard?.renderedInMedia ? parentCard.minMediaHeight : undefined;

  return (
    <Video
      componentId={componentId}
      src={config.video?.src}
      altText={config.textResourceBindings?.altText === undefined ? undefined : altText}
      mediaHeight={mediaHeight}
      innerGrid={innerGrid}
    />
  );
}
