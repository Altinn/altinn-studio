import React from 'react';

import { ImageLayout } from '@app/form-component';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useParentCard } from 'src/layout/Cards/CardContext';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function ImageComponent({ baseComponentId }: PropsFromGenericComponent<'Image'>) {
  const { image, textResourceBindings } = useItemWhenType(baseComponentId, 'Image');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  const languageKey = useCurrentLanguage();
  const parentCard = useParentCard();

  let src = image?.src[languageKey] ?? image?.src.nb ?? '';
  if (src.startsWith('wwwroot')) {
    src = src.replace('wwwroot', `/${window.org}/${window.app}`);
  }

  return (
    <ImageLayout
      componentId={componentId}
      src={src}
      width={image?.width}
      align={image?.align}
      altText={textResourceBindings?.altTextImg}
      help={textResourceBindings?.help}
      innerGrid={innerGrid}
      renderedInCardMedia={parentCard?.renderedInMedia}
      cardMediaHeight={parentCard?.minMediaHeight}
    />
  );
}
