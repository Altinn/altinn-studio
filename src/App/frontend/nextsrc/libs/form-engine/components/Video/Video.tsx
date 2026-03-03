import React from 'react';

import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { useStore } from 'zustand';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompVideoExternal } from 'src/layout/Video/config.generated';

export const Video = ({ component }: ComponentProps) => {
  const props = component as CompVideoExternal;
  const { langAsString } = useLanguage();
  const client = useFormClient();
  const language = useStore(client.textResourceStore, (state) => state.language);

  const altTextKey =
    typeof props.textResourceBindings?.altText === 'string' ? props.textResourceBindings.altText : undefined;
  const altText = altTextKey ? langAsString(altTextKey) : undefined;
  const videoSrc = props.video?.src?.[language] || '';

  return (
    <video
      controls
      id={props.id}
      style={{ width: '100%' }}
    >
      <source src={videoSrc} />
      <track
        kind='captions'
        src={videoSrc}
        srcLang={language}
        label={altText}
      />
    </video>
  );
};
