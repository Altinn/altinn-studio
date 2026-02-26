import React from 'react';

import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { useStore } from 'zustand';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompAudioExternal } from 'src/layout/Audio/config.generated';

export const Audio = ({ component }: ComponentProps) => {
  const props = component as CompAudioExternal;
  const { langAsString } = useLanguage();
  const client = useFormClient();
  const language = useStore(client.textResourceStore, (state) => state.language);

  const altTextKey =
    typeof props.textResourceBindings?.altText === 'string' ? props.textResourceBindings.altText : undefined;
  const altText = altTextKey ? langAsString(altTextKey) : undefined;
  const audioSrc = props.audio?.src?.[language] || '';

  return (
    <audio
      controls
      id={props.id}
      style={{ width: '100%' }}
    >
      <source src={audioSrc} />
      <track
        kind='captions'
        src={audioSrc}
        srcLang={language}
        label={altText}
      />
    </audio>
  );
};
