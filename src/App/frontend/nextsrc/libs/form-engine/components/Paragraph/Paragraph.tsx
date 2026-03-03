import React from 'react';

import { marked } from 'marked';

import { HelpText } from 'src/app-components/HelpText/HelpText';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { asTranslationKey } from 'nextsrc/libs/form-engine/AppComponentsBridge';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompParagraphExternal } from 'src/layout/Paragraph/config.generated';

export const Paragraph = ({ component }: ComponentProps) => {
  const props = component as CompParagraphExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const html = marked(title, { async: false });

  const helpKey = typeof props.textResourceBindings?.help === 'string' ? props.textResourceBindings.help : undefined;
  const helpText = useTextResource(helpKey);

  return (
    <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {helpText && (
        <HelpText
          title={asTranslationKey(titleKey ?? 'helptext.button_title')}
        >
          {helpText}
        </HelpText>
      )}
    </div>
  );
};
