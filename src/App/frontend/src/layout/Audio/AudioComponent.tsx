import React from 'react';

import { Audio } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useParentCard } from 'src/layout/Cards/CardContext';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function AudioComponent({ baseComponentId }: PropsFromGenericComponent<'Audio'>) {
  const config = useComponentConfig(baseComponentId, 'Audio');
  const altText = useEvalOptionalText(
    config.textResourceBindings?.altText,
    Expressions.Audio.textResourceBindings.altText,
  );

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  const parentCard = useParentCard();
  const mediaHeight = parentCard?.renderedInMedia ? parentCard.minMediaHeight : undefined;

  return (
    <Audio
      componentId={componentId}
      src={config.audio?.src}
      altText={altText}
      mediaHeight={mediaHeight}
      innerGrid={innerGrid}
    />
  );
}
