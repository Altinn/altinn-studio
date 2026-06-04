import React from 'react';

import { Audio } from '@app/form-component';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useParentCard } from 'src/layout/Cards/CardContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function AudioComponent({ baseComponentId }: PropsFromGenericComponent<'Audio'>) {
  const { id, audio, textResourceBindings } = useItemWhenType(baseComponentId, 'Audio');
  const languageKey = useCurrentLanguage();
  const renderedInCardMedia = useParentCard()?.renderedInMedia;
  const cardMediaHeight = useParentCard()?.minMediaHeight;

  return (
    <Audio
      id={id}
      src={audio?.src?.[languageKey] || ''}
      srcLang={languageKey}
      altText={textResourceBindings?.altText}
      mediaHeight={renderedInCardMedia ? cardMediaHeight : undefined}
    />
  );
}
