import React from 'react';

import { HelpText } from 'src/app-components/HelpText/HelpText';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { asTranslationKey } from 'nextsrc/libs/form-engine/AppComponentsBridge';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompImageExternal } from 'src/layout/Image/config.generated';

export const Image = ({ component }: ComponentProps) => {
  const props = component as CompImageExternal;
  const altKey =
    typeof props.textResourceBindings?.altTextImg === 'string' ? props.textResourceBindings.altTextImg : undefined;
  const alt = useTextResource(altKey);
  const helpKey = typeof props.textResourceBindings?.help === 'string' ? props.textResourceBindings.help : undefined;
  const helpText = useTextResource(helpKey);
  const src = props.image?.src?.nb ?? props.image?.src?.en ?? '';

  if (!src) {
    return null;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
      <img
        src={src}
        alt={alt}
        style={{ width: props.image?.width, justifySelf: props.image?.align }}
      />
      {helpText && (
        <HelpText
          title={asTranslationKey('helptext.button_title')}
        >
          {helpText}
        </HelpText>
      )}
    </div>
  );
};
