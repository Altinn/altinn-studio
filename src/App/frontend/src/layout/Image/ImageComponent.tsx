import React from 'react';

import { ImageLayout } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useParentCard } from 'src/layout/Cards/CardContext';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function ImageComponent({ baseComponentId }: PropsFromGenericComponent<'Image'>) {
  const config = useComponentConfig(baseComponentId, 'Image');
  const altTextImg = useEvalExpression(
    config.textResourceBindings?.altTextImg,
    Expressions.Image.textResourceBindings.altTextImg,
  );
  const help = useEvalExpression(config.textResourceBindings?.help, Expressions.Image.textResourceBindings.help);

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  const languageKey = useCurrentLanguage();
  const parentCard = useParentCard();

  let src = config.image?.src[languageKey] ?? config.image?.src.nb ?? '';
  if (src.startsWith('wwwroot')) {
    src = src.replace('wwwroot', `/${window.org}/${window.app}`);
  }

  return (
    <ImageLayout
      componentId={componentId}
      src={src}
      width={config.image?.width}
      align={config.image?.align}
      altText={config.textResourceBindings?.altTextImg === undefined ? undefined : altTextImg}
      help={config.textResourceBindings?.help === undefined ? undefined : help}
      innerGrid={innerGrid}
      renderedInCardMedia={parentCard?.renderedInMedia}
      cardMediaHeight={parentCard?.minMediaHeight}
    />
  );
}
