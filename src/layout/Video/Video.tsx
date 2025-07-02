import React from 'react';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useParentCard } from 'src/layout/Cards/CardContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type IVideoProps = PropsFromGenericComponent<'Video'>;

export function VideoComponent({ node }: IVideoProps) {
  const { langAsString } = useLanguage();
  const { id, video, textResourceBindings } = useItemWhenType(node.baseId, 'Video');
  const languageKey = useCurrentLanguage();
  const altText = textResourceBindings?.altText ? langAsString(textResourceBindings.altText) : undefined;
  const videoSrc = video?.src?.[languageKey] || '';
  const renderedInCardMedia = useParentCard()?.renderedInMedia;
  const cardMediaHeight = useParentCard()?.minMediaHeight;

  return (
    <video
      controls
      id={id}
      style={{
        height: renderedInCardMedia ? cardMediaHeight : undefined,
        letterSpacing: '0.3px',
        width: '100%',
      }}
    >
      <source src={videoSrc} />
      <track
        kind='captions'
        src={videoSrc}
        srcLang={languageKey}
        label={altText}
      />
    </video>
  );
}
